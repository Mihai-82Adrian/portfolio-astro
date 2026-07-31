import { RELEASE_IDENTITY } from '../_generated/release-identity.ts';
import { jsonSuccess, methodGuard, type FetchLike } from '../_lib/http.ts';
import {
    createOperationalHandler,
    getOperationalState,
    type OperationalHandlerOptions,
} from '../_lib/operational-context.ts';

interface ReleaseIdentity {
    schemaVersion: 1;
    releaseId: string;
    sourceRevision: string;
}

export function createHandler(
    deps: { releaseIdentity?: ReleaseIdentity; fetchImpl?: FetchLike } & OperationalHandlerOptions = {},
) {
    const release = deps.releaseIdentity ?? RELEASE_IDENTITY;
    return createOperationalHandler('/api/health', async (context: any) => {
        const request = context.request as Request;
        const requestId = getOperationalState(request).context.requestId;
        const methodError = methodGuard(request, ['GET', 'HEAD'], requestId);
        if (methodError) return methodError;

        const response = jsonSuccess({
            service: 'me-mateescu.de',
            status: 'ok',
            release: {
                schemaVersion: release.schemaVersion,
                releaseId: release.releaseId,
                sourceRevision: release.sourceRevision,
            },
        }, requestId);
        return request.method === 'HEAD'
            ? new Response(null, { status: response.status, headers: response.headers })
            : response;
    }, { ...deps, releaseId: release.releaseId });
}

export const onRequest = createHandler();
