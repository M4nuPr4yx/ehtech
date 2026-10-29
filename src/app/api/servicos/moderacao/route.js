import { proxyServiceManagement } from '../../_lib/service-management'
export function GET(request) { return proxyServiceManagement(request, '/servicos/moderacao') }
