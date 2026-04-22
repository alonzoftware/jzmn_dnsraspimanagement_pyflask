from flask import Blueprint, jsonify, request
from src.application.services import SystemHealthService, DnsMetricsService, DnsCacheService, ResponsePolicyService

api_bp = Blueprint('api', __name__, url_prefix='/api')

health_service = SystemHealthService()
dns_service = DnsMetricsService()
dns_cache_service = DnsCacheService()
rpz_service = ResponsePolicyService()

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

@api_bp.route('/rpz/rules', methods=['GET', 'POST'])
def handle_rpz_rules():
    if request.method == 'GET':
        return jsonify(rpz_service.get_rules())
    elif request.method == 'POST':
        data = request.get_json() or {}
        rules = data.get('rules', [])
        return jsonify(rpz_service.save_rules(rules))

@api_bp.route('/rpz/reload', methods=['POST'])
def reload_rpz_zone():
    return jsonify(rpz_service.reload_zone())

@api_bp.route('/rpz/import', methods=['POST'])
def import_rpz_feed():
    data = request.get_json() or {}
    url = data.get('url', '')
    if not url:
        return jsonify({"status": "Error", "message": "No URL provided."}), 400
    return jsonify(rpz_service.fetch_external_feed(url))

from src.application.services import ComparePerformanceService
compare_service = ComparePerformanceService()

@api_bp.route('/compare-performance/domains', methods=['GET', 'POST'])
def handle_compare_domains():
    if request.method == 'GET':
        return jsonify({"domains": compare_service.get_domains()})
    elif request.method == 'POST':
        data = request.get_json() or {}
        domains = data.get('domains', [])
        return jsonify(compare_service.save_domains(domains))

@api_bp.route('/compare-performance/benchmark', methods=['GET'])
def benchmark_resolvers():
    return jsonify(compare_service.benchmark())