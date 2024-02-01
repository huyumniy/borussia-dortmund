import undetected_chromedriver as webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.wait import WebDriverWait
import platform
import sys, os
import requests
import sounddevice as sd
import soundfile as sf
from bs4 import BeautifulSoup
from pprint import pprint
from PIL import Image
import numpy as np
import datetime
import time
import json
import tempfile
import random
import shutil


PROXY = ('proxy.soax.com', 9000, 'MgvurXMD03tA6DjV', 'mobile;;')

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
    driver.execute_script(script, x, y, element)


def find_color_blocks(image_path, target_color=None):
    
    # Open the image
    image = Image.open(image_path)
    image = image.convert("RGB")
    
    print(target_color)
    # Get the image size
    width, height = image.size
    exclude_colors = None
    if not target_color:
        white_shades = [(i, i, i) for i in range(256)]
        black_shades = [(i, i, i) for i in range(0, 256, 255)]
        # width, height = cropped_image.size
        exclude_colors = white_shades + black_shades
    result_coordinates = []
    target_colors = [target_color, 
                     (target_color[0], target_color[1]+1, target_color[2]+1),
                     (target_color[0], target_color[1]-1, target_color[2]+1),
                     (target_color[0], target_color[1]+1, target_color[2]-1),
                     (target_color[0], target_color[1]-1, target_color[2]-1)]
    # Iterate over each pixel in the original image
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


def check_for_403(driver):
    while True:
        try:
            driver.find_element(By.CSS_SELECTOR, '#cf-wrapper')
            print('403')
            time.sleep(30)
            driver.refresh()
        except: break


def check_for_seats(driver, seat):
    try:
        seats = driver.find_elements(By.XPATH, '//*[@id="app"]/div/div/div[3]/div[3]/div[1]/div[3]/div')
        if check_for_element(driver, '//*[@id="app"]/div/div/div[3]/div[3]', xpath=True):
            seats[seat - 1].click()
            driver.find_element(By.CSS_SELECTOR, '#seatlayout-continue-button').click()
    except: pass


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
    seat = int(input('How many seats?\n'))

    # check_for_403(driver)
    # check_for_seats(driver, seat)
    
    df_gb = driver.find_elements(By.CSS_SELECTOR, 'div[class="table__cell table__cell--head price-list__name"]')
    obj = {}
    print("[CATEGORIES]")
    for element in df_gb:
        category = element.find_element(By.CSS_SELECTOR, 'span:not([style])').text
        rgba_color = element.find_element(By.CSS_SELECTOR, 'span[style]').value_of_css_property('background-color')
        rgba_values = rgba_color.strip('rgba()').split(',')
        rgb_color = (int(rgba_values[0]), int(rgba_values[1]), int(rgba_values[2]))
        obj[category] = rgb_color
        print(category)
    category = input("Choose your category: ")
    while True:
        print('starting loop')
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
        canvas.screenshot('picture.png')
        white_shades = [(i, i, i) for i in range(256)]
        black_shades = [(i, i, i) for i in range(0, 256, 255)]

        arr = white_shades + black_shades
        coordinates = find_color_blocks('picture.png', obj[category])
        print(coordinates)
        while True:
            try:
                random_coordinate = random.choice(coordinates)
                print(random_coordinate)
                break
            except Exception as e: 
                print(e)
                continue
        print('canvas click')
        if not click_by_coordinate(driver, canvas, random_coordinate): continue
        # # color_found_count = driver.execute_script(SCRIPT)
        print('clicked on canvas!')
        time.sleep(20)
        
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
