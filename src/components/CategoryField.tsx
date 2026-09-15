import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategoryField({
  value,
  options,
  onChange,
  onAdd,
  label = "Category",
}: {
  value: string;
  options: readonly string[];
  onChange: (category: string) => void;
  onAdd: (name: string) => string;
  label?: string;
}) {
  const [newCategory, setNewCategory] = useState("");
  const known = value && !options.some((option) => option === value) ? [...options, value] : options;

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="min-w-0 bg-card">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {known.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex min-w-0 gap-2">
        <Input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="Add a category"
          className="min-w-0 flex-1 bg-card"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => {
            try {
              const name = onAdd(newCategory);
              onChange(name);
              setNewCategory("");
              toast.success(`${name} added to categories`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not add category.");
            }
          }}
        >
          Add
        </Button>
      </div>
    </div>
  );
}
