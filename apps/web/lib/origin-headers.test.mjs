import { test } from 'node:test'
import assert from 'node:assert/strict'
import { originHeaders } from './origin-headers.ts'
const secret = 'fictitious-origin-secret-32-characters'
test('rewrite and SSR overwrite forged origin/IP headers with edge IP', () => {
  const incoming = new Headers({ 'x-forwarded-for': '203.0.113.7, 127.0.0.1', 'x-origin-secret': 'fake', 'x-reservaya-client-ip': '198.51.100.1' })
  for (const outgoing of [incoming, new Headers({ cookie: 'token=fixture', 'x-reservaya-client-ip': '198.51.100.2' })]) {
    const result = originHeaders(incoming, outgoing, secret)
    assert.equal(result.get('x-origin-secret'), secret)
    assert.equal(result.get('x-reservaya-client-ip'), '203.0.113.7')
    assert.equal(incoming.get('x-origin-secret'), 'fake')
    if (outgoing.has('cookie')) assert.equal(result.get('cookie'), 'token=fixture')
  }
})
test('accepts IPv6 and x-real-ip fallback; rejects arbitrary client-IP text', () => {
  assert.equal(originHeaders(new Headers({ 'x-real-ip': '2001:db8::1' }), undefined, secret).get('x-reservaya-client-ip'), '2001:db8::1')
  assert.equal(originHeaders(new Headers({ 'x-forwarded-for': 'fake' }), undefined, secret).has('x-reservaya-client-ip'), false)
})
test('without configured secret strips untrusted headers and leaves local forwarding available', () => {
  const previous = process.env.ORIGIN_SECRET
  delete process.env.ORIGIN_SECRET
  try {
    const result = originHeaders(new Headers(), new Headers({ 'x-origin-secret': 'fake', 'x-reservaya-client-ip': '198.51.100.1', 'x-forwarded-for': '203.0.113.7' }))
    assert.equal(result.has('x-origin-secret'), false)
    assert.equal(result.has('x-reservaya-client-ip'), false)
    assert.equal(result.get('x-forwarded-for'), '203.0.113.7')
    assert.throws(() => originHeaders(new Headers(), undefined, 'short'), /32/)
  } finally {
    if (previous === undefined) delete process.env.ORIGIN_SECRET
    else process.env.ORIGIN_SECRET = previous
  }
})
