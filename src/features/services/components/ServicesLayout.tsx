import { ReactNode } from 'react';
import { PageLayout, Section } from '@/components/layout/PageLayout';
import { Grid, GridItem } from '@/components/layout/Grid';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface ServicesLayoutProps {
  children: ReactNode;
  showSearch?: boolean;
  showAddButton?: boolean;
  onSearch?: (query: string) => void;
  onAdd?: () => void;
}

export default function ServicesLayout({
  children,
  showSearch = true,
  showAddButton = true,
  onSearch,
  onAdd
}: ServicesLayoutProps) {
  return (
    <PageLayout>
      {/* Header */}
      <Section as="header" className="py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Services</h1>
          {showAddButton && (
            <Button onClick={onAdd}>Add Service</Button>
          )}
        </div>
      </Section>

      {/* Search Section */}
      {showSearch && (
        <Section className="py-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input 
                placeholder="Search services..." 
                className="pl-10"
                onChange={(e) => onSearch?.(e.target.value)}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <Button>Search</Button>
          </div>
        </Section>
      )}

      {/* Content */}
      <Section className="py-8">
        {children}
      </Section>
    </PageLayout>
  );
} 