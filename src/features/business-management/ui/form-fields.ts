/** FormData → plain object, so a zod schema can validate it. */
export function readFormFields(
  formData: FormData,
): Record<string, FormDataEntryValue> {
  return formData instanceof FormData ? Object.fromEntries(formData) : {};
}
