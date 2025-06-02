"use client";

import type { StaffMember } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Save } from "lucide-react";

const staffFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;

interface StaffFormProps {
  staffMember?: StaffMember | null;
  onSubmit: (data: StaffFormValues) => void;
  onCancel?: () => void;
}

export function StaffForm({ staffMember, onSubmit, onCancel }: StaffFormProps) {
  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: staffMember ? { name: staffMember.name } : { name: "" },
  });

  const handleSubmit = (data: StaffFormValues) => {
    onSubmit(data);
    if (!staffMember) { // Reset form only if it's for adding new staff
      form.reset();
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
          {staffMember ? <Save className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
          {staffMember ? "Edit Staff Member" : "Add New Staff Member"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="default">
                {staffMember ? <Save className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                {staffMember ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
