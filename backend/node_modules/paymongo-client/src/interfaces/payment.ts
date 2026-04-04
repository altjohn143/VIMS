enum SourceTypes {
    Source = 'source'
}

interface SourceProps {
    id: string,
    type: SourceTypes,
}

export interface PaymentAttributes {
    amount: number,
    description: string,
    currency: string,
    statement_descriptor?: string,
    source: SourceProps,
}