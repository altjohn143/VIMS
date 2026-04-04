import Paymongo from '../src'
import { expect } from 'chai'
import { Response } from 'superagent'
import { PUBLIC_KEY, SECRET_KEY } from './keys'
import { SourceTypes } from '../src/interfaces/source'
import 'mocha'

describe('Client', () => {
    let client: Paymongo

    before(() => {
        client = new Paymongo(PUBLIC_KEY, SECRET_KEY)
    })

    describe('createPaymentIntent', () => {
        describe('should succeed with integer amount', () => {
            let result: Response

            before(async () => {
                result = await client.createPaymentIntent({ amount: 100 })
            })

            it('with correct resource type', () => {
                expect(result.body).to.deep.nested.property('data.type', 'payment_intent')
            })
            
            it ('with correct amount', () => {
                expect(result.body).to.deep.nested.property('data.attributes.amount', 10000)
            })
        })

        describe('should succeed with float amount', () => {
            let result: Response

            before(async () => {
                result = await client.createPaymentIntent({ amount: 326.79 })
            })

            it('with correct resource type', () => {
                expect(result.body).to.deep.nested.property('data.type', 'payment_intent')
            })
            
            it ('with correct amount', () => {
                expect(result.body).to.deep.nested.property('data.attributes.amount', 32679)
            })
        })
    })

    describe('createSource', () => {
        describe('should succeed', async () => {
            let result: Response

            before(async () => {
                result = await client.createSource({
                    amount: 100,
                    type: SourceTypes.GCash,
                    redirect: {
                        success: 'http://localhost:3000/success',
                        failed: 'http://localhost:3000/fail',
                    }
                })
            })

            it ('with correct resource type', () => {
                expect(result.body).to.deep.nested.property('data.type', 'source')
            })

            it ('with correct amount', () => {
                expect(result.body).to.deep.nested.property('data.attributes.amount', 10000)
            })
        })
    })

    describe('createPayment', () => {
        describe('should succeed', () => {
            it('with correct resource type')
            it('with correct amount')
        })
    })

    describe('verifyWebhook', () => {
        it('should succeed')
    })

    describe('retrievePaymentIntent', () => {
        describe('should success', async () => {
            let result: Response
            const PAYMENT_INTENT_ID = 'pi_cYJScekCfnLfuzsvneHwE5St'

            before(async () => {
                result = await client.retrievePaymentIntent(PAYMENT_INTENT_ID)
            })

            it ('with correct response', () => {
                expect(result.body).to.deep.nested.property('data.id', PAYMENT_INTENT_ID)
            })
        })
    })
})