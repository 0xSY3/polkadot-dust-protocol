import { NextResponse } from 'next/server'
import { registry } from '@/lib/metrics'

export async function GET(): Promise<NextResponse> {
  const metrics = await registry.metrics()
  return new NextResponse(metrics, {
    headers: { 'Content-Type': registry.contentType },
  })
}
