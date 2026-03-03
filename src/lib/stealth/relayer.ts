// Relayer API client

const RELAYER_URL = process.env.NEXT_PUBLIC_RELAYER_URL || 'http://localhost:3001';

export interface RelayerInfo {
  relayerAddress: string;
  balance: string;
  feeBps: number;
  minFee: string;
  chainId: number;
}

export interface FeeCalculation {
  balance: string;
  fee: string;
  amountAfterFee: string;
  feeBps: number;
}

export interface WithdrawResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  fee: string;
  amountAfterFee: string;
}

export interface JobStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  stealthAddress: string;
  recipient: string;
  fee: string | null;
  amountAfterFee: string | null;
  txHash: string | null;
  error: string | null;
}

function buildUrl(path: string, chainId?: number): string {
  if (!chainId) return `${RELAYER_URL}${path}`;
  const sep = path.includes('?') ? '&' : '?';
  return `${RELAYER_URL}${path}${sep}chainId=${chainId}`;
}

async function fetchJson<T>(path: string, init?: RequestInit, chainId?: number): Promise<T | null> {
  try {
    const res = await fetch(buildUrl(path, chainId), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function checkRelayerHealth(chainId?: number): Promise<boolean> {
  try {
    const res = await fetch(buildUrl('/health', chainId));
    return res.ok;
  } catch {
    return false;
  }
}

export async function getRelayerInfo(chainId?: number): Promise<RelayerInfo | null> {
  return fetchJson('/info', undefined, chainId);
}

export async function calculateRelayerFee(stealthAddress: string, chainId?: number): Promise<FeeCalculation | null> {
  return fetchJson('/calculate-fee', {
    method: 'POST',
    body: JSON.stringify({ stealthAddress, chainId }),
  }, chainId);
}

export async function submitRelayerWithdraw(
  stealthAddress: string,
  signature: string,
  recipient: string,
  owner: string,
  chainId?: number,
): Promise<WithdrawResponse | null> {
  const res = await fetch(buildUrl('/withdraw', chainId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stealthAddress, signature, recipient, owner, chainId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Withdrawal failed');
  }

  return res.json();
}

export async function getJobStatus(jobId: string, chainId?: number): Promise<JobStatus | null> {
  return fetchJson(`/status/${jobId}`, undefined, chainId);
}

export async function waitForJobCompletion(jobId: string, maxAttempts = 60, intervalMs = 2000, chainId?: number): Promise<JobStatus | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getJobStatus(jobId, chainId);
    if (!status) return null;
    if (status.status === 'completed' || status.status === 'failed') return status;
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}

export function getRelayerUrl(): string {
  return RELAYER_URL;
}
