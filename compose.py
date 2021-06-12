import os
from PIL import Image
import sys
from helper import *

image_size = (2140, 2140)


def generated_images_from_file(json_filename):
    generatedPath, files = load_json_data(json_filename)
    for file in files:
        result = compose_images(file, image_size)
        file_name = name_file(file)
        result.save(os.path.expanduser(
            '{}/{}'.format(generatedPath, file_name)))
        sys.stdout.write('{}/{}\n'.format(generatedPath, file_name))
        sys.stdout.flush()


if __name__ == "__main__":
    generated_images_from_file('composer.json')