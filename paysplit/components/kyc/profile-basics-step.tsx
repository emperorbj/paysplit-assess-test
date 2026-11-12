"use client"

import * as React from "react"

import { PhoneField } from "@/components/forms/phone-field"
import { KycStepForm } from "@/components/kyc/step-layout"
import { Label } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import type { KycCountry, UpdateKycProfileDto } from "@/types/api/kyc"

export function ProfileBasicsStep({
  countries,
  defaultValue,
  pending,
  onSubmit,
}: {
  countries: KycCountry[]
  defaultValue: UpdateKycProfileDto
  pending: boolean
  onSubmit: (value: UpdateKycProfileDto) => void
}) {
  const [countryCode, setCountryCode] = React.useState(
    countries.some((c) => c.code === defaultValue.countryCode)
      ? defaultValue.countryCode
      : (countries[0]?.code ?? "")
  )
  const [phone, setPhone] = React.useState(defaultValue.phoneNumber)
  const country = countries.find((c) => c.code === countryCode)
  const digits = phone.replace(/\D/g, "")

  return (
    <KycStepForm
      title="Profile Basics"
      description="Select your operating region and default currency for salary processing."
      submitLabel="Continue"
      submitDisabled={!country || digits.length < 7}
      pending={pending}
      onSubmit={() => onSubmit({ countryCode, phoneNumber: phone.trim() })}
    >
      <div className="space-y-6 short:space-y-4">
        <div className="space-y-2">
          <Label htmlFor="kyc-country">Country</Label>
          <NativeSelect
            id="kyc-country"
            value={countryCode}
            onChange={(event) => setCountryCode(event.target.value)}
            aria-describedby="kyc-country-currency"
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
          {country && (
            <p id="kyc-country-currency" className="text-xs text-[#667085]">
              Salaries will be processed in {country.currency}.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="kyc-phone">Mobile Phone Number</Label>
          <PhoneField
            id="kyc-phone"
            // The backend validates the number against the selected country,
            // so the dial code follows the country (and vice versa).
            dialCode={country?.dialCode ?? ""}
            dialCodes={[...new Set(countries.map((c) => c.dialCode))]}
            phone={phone}
            onDialCodeChange={(dialCode) => {
              const match = countries.find((c) => c.dialCode === dialCode)
              if (match) setCountryCode(match.code)
            }}
            onPhoneChange={setPhone}
            required
          />
        </div>
      </div>
    </KycStepForm>
  )
}
