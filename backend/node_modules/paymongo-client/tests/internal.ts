import Paymongo from '../src'
import { expect } from 'chai'
import { PUBLIC_KEY, SECRET_KEY } from './keys';
import 'mocha'

describe('Internal functions run properly', () => {
    let client: Paymongo

    before(() => {
        client = new Paymongo(PUBLIC_KEY, SECRET_KEY)
    })

    describe('getHeader', () => {
        let headers: object

        before(() => {
            headers = client.getHeaders()
        })
        
        it('should have correct accept header', () => {
            expect(headers).to.have.property('Accept', 'application/json');
        })

        it('should have correct content-type header', () => {
            expect(headers).to.have.property('Content-Type', 'application/json');
        })

        it('should have correct authorization header', () => {
            expect(headers).to.have.property('Authorization', `Basic ${Buffer.from(`${SECRET_KEY}:`).toString('base64')}`);
        })
    })

    describe('constructPayload', () => {
        it('should return proper payload format', () => {
            const payload = client.constructPayload({ foo: 'bar' })

            expect(payload).to.deep.nested.property('data.attributes', { foo: 'bar' })
        })
    })
})