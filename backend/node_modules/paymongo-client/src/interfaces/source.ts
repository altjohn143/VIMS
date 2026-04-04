export enum SourceTypes {
    GCash = 'gcash',
    GrabPay = 'grab_pay'
}

interface RedirectProps {
    success: string,
    failed: string
}

interface Address {
    line1: string,
    line2: string,
    state: string,
    postal_code: string,
    city: string,
    country: string
}

interface BillingProps {
    name: string,
    phone: string,
    email: string,
    address: Address
}

export interface SourceAttributes {
    type: SourceTypes,
    amount: number,
    currency?: string,
    redirect: RedirectProps,
    billing?: BillingProps
}