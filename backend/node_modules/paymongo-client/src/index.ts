import request from 'superagent'
import { createHmac } from 'crypto'
import { Modes } from './modes'
import { PaymentIntentAttributes, AttachPaymentIntentPayloadAttributes } from './interfaces/paymentIntent';
import { SourceAttributes } from './interfaces/source';
import { PaymentAttributes } from './interfaces/payment';

export default class Paymongo {
    private publicKey: string
    private secretKey: string
    private baseUrl = 'https://api.paymongo.com/v1'

    constructor(publicKey: string, secretKey: string) {
        this.publicKey = publicKey
        this.secretKey = secretKey
    }

    static verifyWebhook = (webhookSecretKey: string, header: string, payload: object, mode: Modes) => {
        const [timestamp, testSig, liveSig] = header.split(',');

        if (!timestamp || !testSig || !liveSig) return false;

        const signatureComposition = `${timestamp.slice(2)}.${payload}`;
		const hmac = createHmac('sha256', webhookSecretKey);
		hmac.update(signatureComposition, 'utf8');
		const signature = hmac.digest('hex');

		const sigToCompare = mode === Modes.Test ? testSig.slice(3) : liveSig.slice(3);

		return signature === sigToCompare;
    }

    getHeaders(useSecret: boolean = true) {
        const authKey = useSecret ? this.secretKey : this.publicKey
        const authString = Buffer.from(`${authKey}:`).toString('base64')

        const headers = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Basic ${authString}`,
        }

        return headers
    }

    constructPayload = (attributes: object) => ({
        data: { attributes },
    })

    sendRequest = (url: string, method: string = 'GET') => request(method, `${this.baseUrl}${url}`)

    createPaymentIntent = async (attributes: PaymentIntentAttributes) => {
        const { amount, ...rest } = attributes;

		const payload = this.constructPayload({
            ...rest,
            /**
             * This assumes amount is either whole integer or a
             * 2-decimal floating point number
             * 
             * Truncate trailing zeroes to get whole integer equivalent
             * of the amount
             * 
             * Check JS weirdness here
             * https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
             */
            amount: Math.trunc(amount * 100),
            /** Override values for now until API updates */
			payment_method_allowed: ['card'],
			currency: 'PHP',
        })
        
        const result = await this.sendRequest('/payment_intents', 'POST').set(this.getHeaders()).send(payload)
        
		return result
    }

    createSource = async (attributes: SourceAttributes) => {
        const { amount } = attributes;

        const payload = this.constructPayload({
            ...attributes,
			/**
             * This assumes amount is either whole integer or a
             * 2-decimal floating point number
             * 
             * Truncate trailing zeroes to get whole integer equivalent
             * of the amount
             * 
             * Check JS weirdness here
             * https://stackoverflow.com/questions/1458633/how-to-deal-with-floating-point-number-precision-in-javascript
             */
            amount: Math.trunc(amount * 100),
			currency: 'PHP',
        })
        
        const result = await this.sendRequest('/sources', 'POST').set(this.getHeaders()).send(payload)
        
		return result
    }

    createPayment = async (attributes: PaymentAttributes) => {
        const payload = this.constructPayload({
            ...attributes,
			currency: 'PHP',
        })

        const result = await this.sendRequest('/payments', 'POST').set(this.getHeaders()).send(payload)
        
		return result
    }

    attachPaymentIntent = async ({
        intentId,
        methodId,
        redirect,
        clientKey,
    }: {
        intentId: string,
        methodId: string,
        redirect?: string,
        clientKey?: string,
    }) => {
        const payloadData: AttachPaymentIntentPayloadAttributes = {
            payment_method: methodId,
        }

        if (typeof redirect !== 'undefined') {
            payloadData.return_url = redirect
        }

        if (typeof clientKey !== 'undefined') {
            payloadData.client_key = clientKey;
        }

        const payload = this.constructPayload(payloadData)

        const result = await this.sendRequest(`/payment_intents/${intentId}/attach`, 'POST').set(this.getHeaders()).send(payload)

        return result
    }

    retrievePaymentIntent = async (intentId: string) => {
        return this.sendRequest(`/payment_intents/${intentId}`).set(this.getHeaders()).send()
    }
}