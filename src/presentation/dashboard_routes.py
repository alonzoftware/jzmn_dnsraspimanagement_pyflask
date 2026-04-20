from flask import Blueprint, render_template

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard')
def dashboard():
    # In a real app, verify user session here before rendering
    return render_template('dashboard.html')

@dashboard_bp.route('/top-talkers')
def top_talkers():
    # In a real app, verify user session here before rendering
    return render_template('top_talkers.html')