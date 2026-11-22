import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FormField } from '@/components/FormField'
import { applyServerErrors } from '@/lib/forms'
import { enquiryService } from '@/services/enquiry.service'
import type { Product } from '@/types/catalogue'

// Mirrors StoreEnquiryRequest on the backend (which remains the source of truth).
const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(100),
  email: z.email('Enter a valid email address.').max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\-\s]{6,32}$/, 'Enter a valid phone number.')
    .or(z.literal('')),
  message: z.string().trim().max(2000),
})

type EnquiryForm = z.infer<typeof schema>
const fields = ['name', 'email', 'phone', 'message'] as const

export function EnquiryDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false)
  const [thankYou, setThankYou] = useState<string | null>(null)
  const form = useForm<EnquiryForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', phone: '', message: '' },
  })

  function onOpenChange(next: boolean) {
    setOpen(next)
    if (!next && thankYou) {
      // Start fresh next time once an enquiry has been sent.
      setThankYou(null)
      form.reset()
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const message = await enquiryService.submit({
        product_id: product.id,
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        message: values.message || undefined,
      })
      setThankYou(message)
    } catch (error) {
      applyServerErrors(error, form.setError, fields)
    }
  })

  const { errors, isSubmitting } = form.formState

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg">Enquire</Button>
      </DialogTrigger>
      <DialogContent>
        {thankYou ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
            <CheckCircle2 className="size-10 text-emerald-600" />
            <DialogTitle>Thank you</DialogTitle>
            <DialogDescription>{thankYou}</DialogDescription>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <DialogHeader>
              <DialogTitle>Enquire about this product</DialogTitle>
              <DialogDescription>{product.title}</DialogDescription>
            </DialogHeader>

            <FormField label="Name" error={errors.name} {...form.register('name')} autoComplete="name" />
            <FormField label="Email" error={errors.email} {...form.register('email')} type="email" autoComplete="email" />
            <FormField label="Phone (optional)" error={errors.phone} {...form.register('phone')} type="tel" autoComplete="tel" />
            <FormField label="Message (optional)" error={errors.message} {...form.register('message')} multiline />

            {errors.root && (
              <p role="alert" className="text-destructive text-sm">
                {errors.root.message}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send enquiry'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
