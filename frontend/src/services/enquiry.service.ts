import { apiClient } from '@/lib/api/client'
import type { EnquiryInput } from '@/types/catalogue'

export const enquiryService = {
  /** Resolves with the thank-you message to show the customer. */
  async submit(input: EnquiryInput): Promise<string> {
    return (await apiClient.post<{ message: string }>('/enquiries', input)).message
  },
}
