import undetected_chromedriver as webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support.ui import Select
from selenium.webdriver.common.keys import Keys
import sys, os
import sounddevice as sd
import soundfile as sf
from PIL import Image
import numpy as np
import time
import tempfile
import random
import shutil
from twocaptcha import TwoCaptcha

solver = TwoCaptcha('29ada3bf8a7df98cfa4265ea1145c77b')


PROXY = ('proxy.packetstream.io', 31112, 'pergfan', 'xwhmTr7ENnYOciuM')


class ProxyExtension:
    manifest_json = """
    {
        "version": "1.0.0",
        "manifest_version": 2,
        "name": "Chrome Proxy",
        "permissions": [
            "proxy",
            "tabs",
            "unlimitedStorage",
            "storage",
            "<all_urls>",
            "webRequest",
            "webRequestBlocking"
        ],
        "background": {"scripts": ["background.js"]},
        "minimum_chrome_version": "76.0.0"
    }
    """

    background_js = """
    var config = {
        mode: "fixed_servers",
        rules: {
            singleProxy: {
                scheme: "http",
                host: "%s",
                port: %d
            },
            bypassList: ["localhost"]
        }
    };

    chrome.proxy.settings.set({value: config, scope: "regular"}, function() {});

    function callbackFn(details) {
        return {
            authCredentials: {
                username: "%s",
                password: "%s"
            }
        };
    }

    chrome.webRequest.onAuthRequired.addListener(
        callbackFn,
        { urls: ["<all_urls>"] },
        ['blocking']
    );
    """

    def __init__(self, host, port, user, password):
        self._dir = os.path.normpath(tempfile.mkdtemp())

        manifest_file = os.path.join(self._dir, "manifest.json")
        with open(manifest_file, mode="w") as f:
            f.write(self.manifest_json)

        background_js = self.background_js % (host, port, user, password)
        background_file = os.path.join(self._dir, "background.js")
        with open(background_file, mode="w") as f:
            f.write(background_js)

    @property
    def directory(self):
        return self._dir

    def __del__(self):
        shutil.rmtree(self._dir)


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
    proxy_extension = ProxyExtension(*PROXY)
    options.add_argument(f"--load-extension={proxy_extension.directory}")

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


def click_by_coordinate(driver, element, random_coordinate):
    x, y = random_coordinate
    script = """
        var event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: arguments[0],
            clientY: arguments[1]
        });
        arguments[2].dispatchEvent(event);
    """
    driver.execute_script(script, x, y+120, element)


def find_color_blocks(image_path, target_color=None):
    
    image = Image.open(image_path)
    image = image.convert("RGB")
    width, height = image.size

    exclude_colors = None
    if not target_color:
        white_shades = [(i, i, i) for i in range(256)]
        black_shades = [(i, i, i) for i in range(0, 256, 255)]
        exclude_colors = white_shades + black_shades
    

    target_colors = [target_color, 
                     (target_color[0], target_color[1]+1, target_color[2]+1),
                     (target_color[0], target_color[1]-1, target_color[2]+1),
                     (target_color[0], target_color[1]+1, target_color[2]-1),
                     (target_color[0], target_color[1]-1, target_color[2]-1)]
    
    result_coordinates = []
    for x in range(width):
        for y in range(height):
            # Get the RGB values of the pixel
            if x > 30:
                pixel = image.getpixel((x, y))
                if (exclude_colors and pixel not in exclude_colors) or (target_color and pixel in target_colors):
                    result_coordinates.append((x, y))

    # Return the list of coordinates
    return result_coordinates


def check_for_element(driver, selector, click=False, xpath=False):
    try:
        if xpath: element = driver.find_element(By.XPATH, selector)
        else: element = driver.find_element(By.CSS_SELECTOR, selector)
        if click: element.click()
        return element
    except: return False


def check_for_queue(driver, selector):
    try:
        while True:
            if driver.find_element(By.CSS_SELECTOR, selector): time.sleep(20)
            else: break
        return True
    except: return False


def wait_for_element(driver, selector, click=False, xpath=False):
    try:
        if xpath:
            element = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.XPATH, selector)))
        else: element = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        if click: element.click()
        return element
    except: return False


def wait_for_elements(driver, selector, xpath=False):
    try:
        if xpath:
            elements = WebDriverWait(driver, 5).until(
            EC.presence_of_all_elements_located((By.XPATH, selector)))
        else: elements = WebDriverWait(driver, 5).until(
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


if __name__ == "__main__":
    np.set_printoptions(threshold=np.inf)
    driver = selenium_connect()
    url = input('paste link: ')
    driver.get(url)
    wait_for_element(driver, '#cookieConsentAgree', True)
    wait_for_element(driver, '#choose-seat-button', True)
    seats = int(input('Кількість квитків: 1-4\n'))
    nearby_seats = int(input('Кількість сусідніх квитків: 1-4\n'))
    nearby_seats_input = check_for_element(driver, '#stepper-input')
    nearby_seats_input.send_keys(Keys.CONTROL + "a")
    nearby_seats_input.send_keys(Keys.DELETE)
    nearby_seats_input.send_keys(nearby_seats)
    captcha = check_for_element(driver, 'img[class="captcha-code"]')
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
    
    df_gb = driver.find_elements(By.CSS_SELECTOR, 'div[class="table__cell table__cell--head price-list__name"]')
    obj = {}
    print("[КАТЕГОРІЇ]")
    for index, element in enumerate(df_gb):
        category = element.find_element(By.CSS_SELECTOR, 'span:not([style])').text
        rgba_color = element.find_element(By.CSS_SELECTOR, 'span[style]').value_of_css_property('background-color')
        rgba_values = rgba_color.strip('rgba()').split(',')
        rgb_color = (int(rgba_values[0]), int(rgba_values[1]), int(rgba_values[2]))
        obj[index] = rgb_color
        print(index, '|', category)

    while True:
        try: 
            category_input = int(input("Оберіть категорію: "))
            break
        except: print("Можна вводити лише цифри!")
    counter = 0
    while True:
        if counter > 10:
            minus_link = check_for_element(driver, "a.leaflet-control-zoom-out")
            plus_link = check_for_element(driver, "a.leaflet-control-zoom-in")
            while "leaflet-disabled" not in minus_link.get_attribute("class"):
                minus_link.click()

                try: WebDriverWait(driver, 3).until(
                        EC.staleness_of(minus_link) if "leaflet-disabled" in minus_link.get_attribute("class") else EC.element_to_be_clickable((By.CSS_SELECTOR, "a.leaflet-control-zoom-out"))
                    )
                except: pass
            plus_link.click()
            counter = 0
        # driver.refresh()
        # check_for_403(driver)
        # check_for_queue(driver, '#title-element')
        # check_for_element(driver, '#synopsis-book-button', click=True)
        # if check_for_element(driver, '#synopsis-book-button'): input('Login')
        # time.sleep(5)
        # check_for_seats(driver, seat)
        canvas = wait_for_element(driver, 'canvas')
        if not canvas: continue
        time.sleep(3)
        if wait_for_element(driver, '//p[text()="The connection to the server could not be established."]'):
            print('govnina')
        wait_for_element(driver, '#modal-notification-close', click=True)
        canvas.screenshot('picture.png')
        coordinates = find_color_blocks('picture.png', obj[category_input])
        try:
            random_coordinate = random.choice(coordinates)
            print(random_coordinate)
        except: 
            counter+=1
            continue
        
        click_by_coordinate(driver, canvas, random_coordinate)
        wait_for_element(driver, '#modal-notification-close', click=True)

        # # color_found_count = driver.execute_script(SCRIPT)
        print('clicked on canvas!')
        seats_elements = wait_for_elements(driver, '#seat-cards-list > li')
        if seats_elements and len(seats_elements) == seats: break
        
        
        # wait_for_element(driver, 'button[data-id="ticket-selector-proceed"]', True)
        # if wait_for_element(driver, '//div[text()="Please select from the following option(s)"]', xpath=True):
        #     try:
        #         data, fs = sf.read('noti.wav', dtype='float32')  
        #         sd.play(data, fs)
        #         status = sd.wait()
        #         raw_pavilion = driver.find_element(By.XPATH, '//div[contains(text(), "ticket(s)")]').text
        #         pavilion = raw_pavilion.split(': ')[0]
        #         vs = driver.find_element(By.XPATH, '//span[contains(text(), "vs")]/../..').text
        #         raw_match, price, amount = vs.split('\n')
        #         match = raw_match.split(' - ')[0]
        #         print(match, pavilion, price, amount)
        #         # cookies = driver.get_cookies()
        #         # cookies_json = json.dumps(cookies)
        #         # data = {"match": match, "pavilion": pavilion, "price": price, "amount": amount, "cookies": cookies_json}
        #         # post_request(data)
        #         q = input("continue? ('q' for quit)\n")
        #         if q == "q": break
        #         else: 
        #             driver.find_element(By.XPATH, '//span[contains(text(), "Ticket options")]/../../div[1]').click()
        #             driver.find_element(By.XPATH, '//div[contains(text(), "Cancel Transaction?")]/../../div[3]/div[1]').click()
        #             continue
        #     except Exception as e: print(e)
        # # driver.get('https://in.bookmyshow.com/nm-api/de/getLayoutDrawing?venuecode=spsm&eventcode=et00367548&sessionid=10064')
        # # pre_text = driver.find_element(By.TAG_NAME, 'pre').text
        # # extracted_data = json.loads(pre_text)
        # # pprint(extracted_data['seatLayout']['data']['base']['action']['path']['items'])
    wait_for_element(driver, '#add-to-cart', True)
    print('Done')