import { ReactNode } from 'react';

interface SettingRowProps {
  label: string;
  description: string;
  control: ReactNode;
}

export default function SettingRow({ label, description, control }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="font-medium mb-1">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex-shrink-0">{control}</div>
    </div>
  );
}
