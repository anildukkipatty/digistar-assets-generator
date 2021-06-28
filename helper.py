import os
import itertools
import json
from PIL import Image


def get_combination_of_accessories(list_of_accessories, minimum_accessories_count):
    all_combinations = []
    for r in range(minimum_accessories_count, len(list_of_accessories) + 1):
        combinations_object = itertools.combinations(list_of_accessories, r)
        combinations_list = list(combinations_object)
        all_combinations += combinations_list
    return all_combinations


def name_file(files):
    file_names = []
    for index, file in enumerate(files):
        file_names.append(file.split('/')[-1].split('.')[0])
    file_name = '_'.join(file_names) + '.png'
    return file_name


def compose_images(files, size):
    result = Image.new(mode='RGBA', size=size, color=(255, 255, 255))
    for index, file in enumerate(files):
        img = Image.open(os.path.expanduser(file)).convert('RGBA')
        result.paste(img, (0, 0), mask=img)
    return result


def load_json_data(json_filename):
    f = open(json_filename)
    data = json.load(f)
    generatedPath = data['generatedPath']
    files = data['files']
    return generatedPath, files