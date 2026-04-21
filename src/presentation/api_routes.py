from flask import Blueprint, jsonify, request
from src.application.services import SystemHealthService, DnsMetricsService

api_bp = Blueprint('api', __name__, url_prefix='/api')

health_service = SystemHealthService()
dns_service = DnsMetricsService()

@api_bp.route('/health')
def get_health():
    metrics = health_service.get_health_metrics()
    return jsonify(metrics)

@api_bp.route('/dns-stats')
def get_dns_stats():
    source = request.args.get('source', 'simulated')
    metrics = dns_service.get_dns_metrics(source)
    return jsonify(metrics)

@api_bp.route('/top-talkers')
def get_top_talkers():
    source = request.args.get('source', 'simulated')
    limit = int(request.args.get('limit', 10))
    metrics = dns_service.get_top_talkers(source, limit)
    return jsonify(metrics)

@api_bp.route('/internet-status')
def get_internet_status():
    from src.application.services import InternetCheckService
    internet_service = InternetCheckService()
    status = internet_service.run_all_checks()
    return jsonify(status)