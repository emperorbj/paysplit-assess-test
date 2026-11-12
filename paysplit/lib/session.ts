// TODO: replace with the authenticated user from the session/API.
export const CURRENT_USER = {
  firstName: "Paul",
  lastName: "Clarke",
  fullName: "Paul Clarke",
  email: "paulclarke@gmail.com",
  dialCode: "+234",
  phone: "803 456 7890",
  accountId: "USER0842196",
  memberSince: "2024-01-15",
  avatar: "/images/avatars/paul.jpg",
  tier: 2,
  account: {
    number: "1029384756",
    name: "Paul Clarke",
    bank: "Providus Bank / PaySplit",
  },
}

export type CurrentUser = typeof CURRENT_USER

/** "1029382345" → "*****2345" */
export function maskAccountNumber(number: string) {
  return `*****${number.slice(-4)}`
}
