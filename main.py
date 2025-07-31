import undetected_chromedriver as webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.wait import WebDriverWait
from selenium.common.exceptions import WebDriverException
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
import sys, os
import sounddevice as sd
import soundfile as sf
from PIL import Image
import numpy as np
import time
import random
import io, base64

def selenium_connect():
    options = webdriver.ChromeOptions()
    options.add_argument("--start-maximized")
    #options.add_argument("--incognito")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--log-level=3")
    options.add_argument("--disable-web-security")
    options.add_argument("--disable-site-isolation-trials")
    options.add_argument('--ignore-certificate-errors')
    options.add_argument('--lang=EN')

    prefs = {"credentials_enable_service": False,
        "profile.password_manager_enabled": False}
    options.add_experimental_option("prefs", prefs)


    # Create the WebDriver with the configured ChromeOptions
    driver = webdriver.Chrome(
        options=options,
        enable_cdp_events=True,
        
    )

    # screen_width, screen_height = driver.execute_script(
    #     "return [window.screen.width, window.screen.height];")
    
    # desired_width = int(screen_width / 2)
    # desired_height = int(screen_height / 3)
    # driver.set_window_position(0, 0)
    driver.set_window_size(1920, 1080)

    return driver


def safe_click_offset(driver, element, offset_x, offset_y):
    # 1. Pull element into the viewport
    driver.execute_script("arguments[0].scrollIntoView({block:'center', inline:'center'})", element)
    
    # 2. Grab its size & position
    rect = element.rect   # {'height':…, 'width':…, 'x':…, 'y':…}
    w, h = rect['width'], rect['height']
    
    # 3. Make sure your offsets lie within [0..width] × [0..height]
    if not (0 <= offset_x <= w and 0 <= offset_y <= h):
        raise ValueError(f"Offset ({offset_x},{offset_y}) outside element size ({w}×{h})")
    
    # 4. Compute the target absolute viewport point
    abs_x = rect['x'] + offset_x
    abs_y = rect['y'] + offset_y
    
    # 5. Scroll a little more if that point is still outside
    driver.execute_script("""
      window.scrollBy(
         arguments[0] - window.innerWidth  * 0.4,
         arguments[1] - window.innerHeight * 0.4
      );
    """, abs_x, abs_y)
    
    # 6. Try the real‐mouse approach
    try:
        ActionChains(driver) \
            .move_to_element_with_offset(element, offset_x, offset_y) \
            .click() \
            .perform()
        return True
    except WebDriverException as e:
        # Fallback: dispatch full pointer sequence via JS
        script = """
        var el = document.elementFromPoint(arguments[0], arguments[1]);
        if (!el) return false;
        var params = {
          pointerId: 1, bubbles: true, cancelable: true, view: window,
          clientX: arguments[0], clientY: arguments[1], button: 0
        };
        ['pointerdown','mousedown','pointerup','mouseup','click']
          .forEach(function(t){ el.dispatchEvent(new PointerEvent(t, params)); });
        return true;
        """
        return driver.execute_script(script, abs_x, abs_y)


def is_similar(color1, color2, threshold=25):
    return all(abs(c1 - c2) <= threshold for c1, c2 in zip(color1, color2))

def find_color_blocks(image, target_colors=None, threshold=25):
    width, height = image.size
    print(f"[DEBUG] Image size: {width}x{height}")

    exclude_colors = None
    if not target_colors:
        print("[DEBUG] No target colors provided, generating exclude_colors (white and black shades)")
        white_shades = [(i, i, i) for i in range(256)]
        black_shades = [(0, 0, 0), (255, 255, 255)]
        exclude_colors = set(white_shades + black_shades)
    else:
        print(f"[DEBUG] Target colors provided: {target_colors}")

    result_coordinates = []
    print("[DEBUG] Starting pixel scan...")

    for x in range(width):
        for y in range(height):
            if x > 30:
                pixel = image.getpixel((x, y))

                if target_colors:
                    if any(is_similar(pixel, target, threshold) for target in target_colors):
                        result_coordinates.append((x, y))
                        if len(result_coordinates) <= 10:
                            print(f"[MATCH] Pixel at ({x},{y}) matched: {pixel}")
                elif exclude_colors:
                    if pixel not in exclude_colors:
                        result_coordinates.append((x, y))
                        if len(result_coordinates) <= 10:
                            print(f"[MATCH] Pixel at ({x},{y}) matched: {pixel}")

    print(f"[DEBUG] Total matched pixels: {len(result_coordinates)}")
    return result_coordinates


def check_for_element(driver, selector, click=False, xpath=False):
    try:
        if xpath: element = driver.find_element(By.XPATH, selector)
        else: element = driver.find_element(By.CSS_SELECTOR, selector)
        if click: element.click()
        return element
    except: return False


def wait_for_element(driver, selector, click=False, xpath=False, wait=5):
    try:
        if xpath:
            element = WebDriverWait(driver, wait).until(
            EC.presence_of_element_located((By.XPATH, selector)))
        else: element = WebDriverWait(driver, wait).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        if click: element.click()
        return element
    except: return False


def wait_for_elements(driver, selector, xpath=False, wait=5):
    try:
        if xpath:
            elements = WebDriverWait(driver, wait).until(
            EC.presence_of_all_elements_located((By.XPATH, selector)))
        else: elements = WebDriverWait(driver, wait).until(
            EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector)))
        return elements
    except: return False


# def post_request(json_data):
#     json_data = json.dumps(data)
#     headers = {"Content-Type": "application/json"}
#     try:
#         response = requests.post("http://localhost:443/book", data=json_data, headers=headers)
#         print(response)
#     except Exception as e:
#         print(e)
#     # Check the response status code
#     if response.status_code == 200:
#         print("POST request successful!")
#     else:
#         print("POST request failed.")


def old_zoom(driver):
    minus_link = check_for_element(driver, "a.leaflet-control-zoom-out")
    plus_link = check_for_element(driver, "a.leaflet-control-zoom-in")
    while "leaflet-disabled" not in minus_link.get_attribute("class"):
        minus_link.click()

        try: WebDriverWait(driver, 3).until(
                EC.staleness_of(minus_link) if "leaflet-disabled" in minus_link.get_attribute("class") else EC.element_to_be_clickable((By.CSS_SELECTOR, "a.leaflet-control-zoom-out"))
            )
        except: pass
    plus_link.click()


def new_zoom(driver):
    minus_link = check_for_element(driver, 'button[data-ref="seatmap-zoom-out"]')
    plus_link = check_for_element(driver, 'button[data-ref="seatmap-zoom-in"]')
    while not minus_link.get_attribute("disabled"):
        minus_link.click()

        try: WebDriverWait(driver, 3).until(
                EC.staleness_of(minus_link) if minus_link.get_attribute("disabled") else EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[data-ref="seatmap-zoom-out"]'))
            )
        except: pass
    plus_link.click()


def grab_full_map_image(driver, map_selector):
    """
    1) Finds the seatmap container via CSS selector.
    2) Asks Chrome CDP for a full-page screenshot (offscreen included).
    3) Crops to the container’s bounding rect.
    """
    # locate container
    elem = wait_for_element(driver, map_selector, wait=5)
    if not elem:
        print(f"couldn't find element {map_selector}")
        return False

    # get its exact position + size in CSS pixels
    box = driver.execute_script("""
      const r = arguments[0].getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    """, elem)

    # capture full-page screenshot via CDP
    result = driver.execute_cdp_cmd(
        "Page.captureScreenshot",
        { "format": "png", "fromSurface": True, "captureBeyondViewport": True }
    )
    png_data = base64.b64decode(result["data"])
    full = Image.open(io.BytesIO(png_data))

    # crop to the seatmap container
    left, top = int(box["x"]), int(box["y"])
    right = left + int(box["width"])
    bottom = top + int(box["height"])
    return full.crop((left, top, right, bottom))



if __name__ == "__main__":
    np.set_printoptions(threshold=np.inf)
    driver = selenium_connect()
    url = input('paste link: ')
    overall_counter = 0
    while True:
        try:
            driver.get(url)
            wait_for_element(driver, '#cookieConsentAgree', True)
            wait_for_element(driver, '#choose-seat-button', True)
            seats = int(input('Кількість квитків: 1-4\n'))
            nearby_seats = int(input('Кількість сусідніх квитків: 1-4\n'))
            nearby_seats_input = check_for_element(driver, '#stepper-input')
            nearby_seats_input.send_keys(Keys.CONTROL + "a")
            nearby_seats_input.send_keys(Keys.DELETE)
            nearby_seats_input.send_keys(nearby_seats)
            captcha = wait_for_element(driver, '//fieldset/div/img', xpath=True)
            if captcha: captcha.screenshot('captcha.png')
            area = wait_for_element(driver, '#select-area')
            if area: area_select = Select(area)
            print("[ТЕРИТОРІЯ СТАДІОНУ]")
            for index, area_option in enumerate(area_select.options):
                print(index, '|', area_option.text)
            while True:
                area_input = input("Оберіть територію: ")
                try: 
                    area_select.select_by_index(area_input)
                    break
                except: print("Такої території не існує!")
            check_for_element(driver, '#pricelist-tab', click=True)
            time.sleep(2)
            df_gb = driver.find_elements(By.CSS_SELECTOR, 'div[class="table__cell table__cell--head price-list__name"]')
            obj = {}
            print("[КАТЕГОРІЇ]")
            category_counter = 1
            for index, element in enumerate(df_gb):
                category = element.find_element(By.CSS_SELECTOR, 'span:not([style])').text
                rgba_color = element.find_element(By.CSS_SELECTOR, 'span[style]').value_of_css_property('background-color')
                rgba_values = rgba_color.strip('rgba()').split(',')
                rgb_color = (int(rgba_values[0]), int(rgba_values[1]), int(rgba_values[2]))
                obj[index] = rgb_color
                print(index, '|', category)
            category_arr = []
            while True:
                try: 
                    category_input = int(input("Оберіть категорію [%s]: " % category_counter))
                    category_arr.append(obj[category_input])
                    category_counter+=1
                    next_category = input('Обрати ще одну категорію? [Так|Ні]')
                    if next_category.lower() in ['ні']: break
                except Exception as e: print("Можна вводити лише цифри!", e)
            counter = 0
            # #background > image
            while True:
                if counter > 10:
                    if check_for_element(driver, 'div[data-ref="seatmap-zoom-controls"]'):
                        new_zoom(driver)
                        overall_counter+=1
                    else: 
                        old_zoom(driver)
                        overall_counter+=1
                if overall_counter >= 3: break
                # driver.refresh()
                # check_for_403(driver)
                # check_for_queue(driver, '#title-element')
                # check_for_element(driver, '#synopsis-book-button', click=True)
                # if check_for_element(driver, '#synopsis-book-button'): input('Login')
                # time.sleep(5)
                # check_for_seats(driver, seat)
                png = None
                image = None
                canvas = wait_for_element(driver, 'canvas', wait=1)
                if canvas:
                    png = canvas.screenshot_as_png
                    image = Image.open(io.BytesIO(png)).convert("RGB")
                if not canvas: 
                    canvas = check_for_element(driver, "#seatMapContainer")
                    image = grab_full_map_image(driver, "#seatMapContainer")
                if not image: continue
                wait_for_element(driver, '#modal-notification-close', click=True)
                
                coordinates = find_color_blocks(image, category_arr)
                print(coordinates)
                try:
                    random_coordinate = random.choice(coordinates)
                    print(random_coordinate)
                except: 
                    counter+=1
                    continue
                x, y = random_coordinate
                safe_click_offset(driver, canvas, x, y)
                if wait_for_element(driver, "//p[contains(text(),'The connection to the server could not be established.')]", wait=15):
                    print('govnina')
                wait_for_element(driver, '#modal-notification-close', click=True)

                # # color_found_count = driver.execute_script(SCRIPT)
                print('clicked on canvas!')
                seats_elements = wait_for_elements(driver, '#seat-cards-list > li', wait=0.1)
                if seats_elements and len(seats_elements) == seats: break
                
                
                check_for_element(driver, 'button[data-id="ticket-selector-proceed"]', True)
                if check_for_element(driver, '//div[text()="Please select from the following option(s)"]', xpath=True):
                    try:
                        data, fs = sf.read('noti.wav', dtype='float32')  
                        sd.play(data, fs)
                        status = sd.wait()
                        raw_pavilion = driver.find_element(By.XPATH, '//div[contains(text(), "ticket(s)")]').text
                        pavilion = raw_pavilion.split(': ')[0]
                        vs = driver.find_element(By.XPATH, '//span[contains(text(), "vs")]/../..').text
                        raw_match, price, amount = vs.split('\n')
                        match = raw_match.split(' - ')[0]
                        print(match, pavilion, price, amount)
                        # cookies = driver.get_cookies()
                        # cookies_json = json.dumps(cookies)
                        # data = {"match": match, "pavilion": pavilion, "price": price, "amount": amount, "cookies": cookies_json}
                        # post_request(data)
                        q = input("continue? ('q' for quit)\n")
                        if q == "q": break
                        else: 
                            driver.find_element(By.XPATH, '//span[contains(text(), "Ticket options")]/../../div[1]').click()
                            driver.find_element(By.XPATH, '//div[contains(text(), "Cancel Transaction?")]/../../div[3]/div[1]').click()
                            continue
                    except Exception as e: print(e)
                # driver.get('https://in.bookmyshow.com/nm-api/de/getLayoutDrawing?venuecode=spsm&eventcode=et00367548&sessionid=10064')
                # pre_text = driver.find_element(By.TAG_NAME, 'pre').text
                # extracted_data = json.loads(pre_text)
                # pprint(extracted_data['seatLayout']['data']['base']['action']['path']['items'])
            if overall_counter >= 3: 
                overall_counter = 0
                continue            
            wait_for_element(driver, '#add-to-cart', True)
            print('Done')
        except Exception as e:
            print('main loop error, waiting for 60 sec and retry', e)
            time.sleep(60)
