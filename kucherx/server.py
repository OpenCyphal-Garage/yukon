import json
import os
import webbrowser
from functools import wraps

from flask import Flask, render_template, jsonify, request
import app
from domain.god_state import GodState
from services.api import Api

gui_dir = os.path.join(os.path.dirname(__file__), "html")  # development path

if not os.path.exists(gui_dir):  # frozen executable path
    gui_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'html')

server = Flask(__name__, static_folder=gui_dir, template_folder=gui_dir, static_url_path="")
server.config['SEND_FILE_MAX_AGE_DEFAULT'] = 1  # disable caching

our_token = "ABC"

def verify_token(function):
    @wraps(function)
    def wrapper(*args, **kwargs):
        data = json.loads(request.data)
        token = data.get('token')
        if token == our_token:
            return function(*args, **kwargs)
        else:
            raise Exception('Authentication error')

    return wrapper


@server.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store'
    return response


def make_landing(state: GodState, api: Api):
    @server.route('/', defaults={'path': ''})
    @server.route('/<path:path>')
    def landing(path):
        """
        Render index.html. Initialization is performed asynchronously in initialize() function
        """
        if path == "":
            return render_template('add_transport/add_transport.html', token=our_token)
        else:
            initial_json = request.get_json()
            processed_json = json.loads(initial_json)
            return getattr(api, path)(**processed_json)


@server.route('/init', methods=['POST'])
@verify_token
def initialize():
    '''
    Perform heavy-lifting initialization asynchronously.
    :return:
    '''
    can_start = app.initialize()

    if can_start:
        response = {
            'status': 'ok',
        }
    else:
        response = {
            'status': 'error'
        }

    return jsonify(response)


@server.route('/open-url', methods=['POST'])
@verify_token
def open_url():
    url = request.json['url']
    webbrowser.open_new_tab(url)

    return jsonify({})


@server.route('/do/stuff', methods=['POST'])
@verify_token
def do_stuff():
    result = app.do_stuff()

    if result:
        response = {'status': 'ok', 'result': result}
    else:
        response = {'status': 'error'}

    return jsonify(response)
