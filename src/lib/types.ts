export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type Overwrite<T1, T2> = Pick<T1, Exclude<keyof T1, keyof T2>> & T2
