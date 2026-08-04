import logging


def pytest_configure():

    logging.getLogger(
        "transformers"
    ).setLevel(
        logging.ERROR
    )