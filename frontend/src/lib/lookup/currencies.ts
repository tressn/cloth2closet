export const CURRENCIES = ["USD", 
    "CAD",
    "CNY",
    "EGP", 
    "EUR",
    "ETB", 
    "GBP",
    "GHS",
    "INR",
    "KES",
    "NGN", 
    "XAF",
    "XOF", 
    "ZAR",
                    ] as const;
export type Currency = (typeof CURRENCIES)[number];
export const CURRENCY_SET = new Set<string>(CURRENCIES);