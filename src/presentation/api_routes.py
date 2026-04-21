from flask import Blueprint, jsonify, request
from src.application.services import SystemHealthService, DnsMetricsService, DnsCacheService

api_bp = Blueprint('api', __name__, url_prefix='/api')

health_service = SystemHealthService()
dns_service = DnsMetricsService()
dns_cache_service = DnsCacheService()

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

@api_bp.route('/dns-cache/stats')
def get_dns_cache_stats():
    return jsonify(dns_cache_service.get_cache_stats())

@api_bp.route('/dns-cache/entries')
def get_dns_cache_entries():
    query = request.args.get('q', None)
    return jsonify(dns_cache_service.get_cache_entries(query))

@api_bp.route('/dns-cache/flush', methods=['POST'])
def flush_dns_cache():
    return jsonify(dns_cache_service.flush_cache())

@api_bp.route('/dns-cache/flushname', methods=['POST'])
def flush_dns_domain():
    data = request.get_json() or {}
    domain = data.get('domain', '')
    if not domain:
        return jsonify({"status": "Failed", "message": "No domain provided."}), 400
    return jsonify(dns_cache_service.flush_domain(domain))