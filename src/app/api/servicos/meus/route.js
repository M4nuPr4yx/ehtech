import { proxyServiceManagement } from '../../_lib/service-management'
export function GET(request) { return proxyServiceManagement(request, '/servicos/meus') }
export function POST(request) { return proxyServiceManagement(request, '/servicos/meus') }
