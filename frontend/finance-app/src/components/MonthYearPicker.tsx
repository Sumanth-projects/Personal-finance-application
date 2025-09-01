'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthYearPickerProps {
  selectedMonth: number;
  selectedYear: number;
  onDateChange: (month: number, year: number) => void;
  className?: string;
}

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export function MonthYearPicker({ 
  selectedMonth, 
  selectedYear, 
  onDateChange, 
  className = '' 
}: MonthYearPickerProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Generate years from 10 years ago to current year (no future years)
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 10 + i);
  
  // Check if we're at the current month/year (can't go forward)
  const isAtCurrentMonth = selectedYear === currentYear && selectedMonth >= currentMonth;

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      onDateChange(12, selectedYear - 1);
    } else {
      onDateChange(selectedMonth - 1, selectedYear);
    }
  };

  const handleNextMonth = () => {
    // Don't allow navigation to future months
    if (isAtCurrentMonth) {
      return; // Do nothing if trying to go to future months
    }
    
    if (selectedMonth === 12) {
      // Don't allow going to future years
      if (selectedYear >= currentYear) {
        return;
      }
      onDateChange(1, selectedYear + 1);
    } else {
      onDateChange(selectedMonth + 1, selectedYear);
    }
  };

  const handleToday = () => {
    const now = new Date();
    onDateChange(now.getMonth() + 1, now.getFullYear());
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Filter by:</Label>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Month Selector */}
        <Select
          value={selectedMonth.toString()}
          onValueChange={(value) => onDateChange(parseInt(value), selectedYear)}
        >
          <SelectTrigger className="w-[130px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months
              .filter(month => {
                // If it's the current year, only show months up to current month
                if (selectedYear === currentYear) {
                  return month.value <= currentMonth;
                }
                // For past years, show all months
                return true;
              })
              .map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Year Selector */}
        <Select
          value={selectedYear.toString()}
          onValueChange={(value) => onDateChange(selectedMonth, parseInt(value))}
        >
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          disabled={isAtCurrentMonth}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Today Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleToday}
        className="h-8 text-xs"
      >
        Today
      </Button>

      {/* Selected Date Display */}
      <div className="text-sm text-muted-foreground">
        {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
      </div>
    </div>
  );
}
