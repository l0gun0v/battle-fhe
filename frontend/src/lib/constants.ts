
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS

if (!FACTORY_ADDRESS) {
  throw new Error('FACTORY_ADDRESS is not defined')
}
