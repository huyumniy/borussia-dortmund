from PIL import Image

def find_color_blocks(image_path):
    # Open the image
    image = Image.open(image_path)
    image = image.convert("RGB")
    

    # Get the image size
    width, height = image.size
    print(width, height)
    cropped_image = image.crop((23, 120, width -365, height - 40))
    white_shades = [(i, i, i) for i in range(256)]
    black_shades = [(i, i, i) for i in range(0, 256, 255)]
    width, height = cropped_image.size
    print(width, height)
    target_colors = white_shades + black_shades
    # Initialize a list to store coordinates of pixels that don't match the target colors
    result_coordinates = []

    # # Iterate over each pixel in the original image
    # for x in range(width - 65):
    #     for y in range(height - 120):
    #         # Get the RGB values of the pixel
    #         pixel = image.getpixel((x, y))
    #         # Check if the pixel color is not in the target_colors list
    #         if pixel not in target_colors:
    #             # If not in target_colors, add the pixel coordinates to the result list
    #             result_coordinates.append((x, y))

    # # Return the list of coordinates
    # return result_coordinates
    cropped_image.show()


if __name__ == "__main__":
    result = find_color_blocks('picture.png')
    print(result)