enum ThreeDeeSecureModes {
    Any = 'any',
    Automatic = 'automatic'
}

enum PaymentMethodAllowed {
    Cash = 'cash'
}

interface CardMethod {
    request_three_d_secure: ThreeDeeSecureModes
}

interface PaymentMethodOptions {
    card: CardMethod
}

export interface PaymentIntentAttributes {
    amount: number,
    payment_method_allowed?: Array<PaymentMethodAllowed>,
    payment_method_options?: PaymentMethodOptions,
    description?: string,
    statement_descriptor?: string,
    currency?: string,
    metadata?: object
}

export interface AttachPaymentIntentPayloadAttributes {
    payment_method: string,
    return_url?: string,
    client_key?: string,
}