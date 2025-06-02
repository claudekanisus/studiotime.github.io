
"use client";

import * as React from "react";
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
import { PlusCircle, Save, BookOpen, Users2, ChevronsUpDown } from "lucide-react";
import { CLASS_LEVELS } from "@/lib/constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const staffFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  subject: z.string().min(2, {
    message: "Subject must be at least 2 characters.",
  }),
  assignedClass: z.array(z.string()).min(1, {
    message: "Please select at least one class.",
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
    defaultValues: staffMember
      ? { name: staffMember.name, subject: staffMember.subject || "", assignedClass: Array.isArray(staffMember.assignedClass) ? staffMember.assignedClass : (staffMember.assignedClass ? [staffMember.assignedClass] : []) }
      : { name: "", subject: "", assignedClass: [] },
  });

  React.useEffect(() => {
    if (staffMember) {
      form.reset({ name: staffMember.name, subject: staffMember.subject || "", assignedClass: Array.isArray(staffMember.assignedClass) ? staffMember.assignedClass : (staffMember.assignedClass ? [staffMember.assignedClass] : []) });
    } else {
      form.reset({ name: "", subject: "", assignedClass: [] });
    }
  }, [staffMember, form]);

  const handleSubmit = (data: StaffFormValues) => {
    onSubmit(data);
    if (!staffMember) { 
      form.reset({ name: "", subject: "", assignedClass: [] });
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
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-muted-foreground" /> Subject
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Mathematics" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="assignedClass"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <Users2 className="h-4 w-4 text-muted-foreground" /> Assigned Classes
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.length && "text-muted-foreground"
                          )}
                        >
                          {field.value?.length
                            ? field.value.sort((a, b) => CLASS_LEVELS.indexOf(a) - CLASS_LEVELS.indexOf(b)).join(", ")
                            : "Select classes"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <ScrollArea className="h-48">
                          {CLASS_LEVELS.map((level) => (
                            <div
                              key={level}
                              className="flex items-center space-x-2 p-2 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer"
                              // Removed onClick from here, Checkbox handles its own state
                            >
                              <Checkbox
                                id={`class-${level}-${field.name}`} // Ensure unique ID across forms if multiple
                                checked={field.value?.includes(level)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  let newValue;
                                  if (checked) {
                                    newValue = [...currentValue, level];
                                  } else {
                                    newValue = currentValue.filter(
                                      (value) => value !== level
                                    );
                                  }
                                  // Sort for consistent display and to help React Hook Form detect changes
                                  field.onChange(newValue.sort((a, b) => CLASS_LEVELS.indexOf(a) - CLASS_LEVELS.indexOf(b)));
                                }}
                              />
                              <Label htmlFor={`class-${level}-${field.name}`} className="font-normal cursor-pointer flex-1 py-1">
                                {level}
                              </Label>
                            </div>
                          ))}
                        </ScrollArea>
                    </PopoverContent>
                  </Popover>
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
