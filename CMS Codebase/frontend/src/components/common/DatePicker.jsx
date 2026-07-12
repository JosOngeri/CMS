import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

const DatePicker = ({ 
  value, 
  onChange, 
  label, 
  type = 'date', 
  showTime = false,
  minDate,
  maxDate,
  className = '',
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : new Date());
  const [selectedTime, setSelectedTime] = useState(value ? new Date(value) : new Date());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDateClick = (day) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(newDate);
    
    if (showTime) {
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
    }
    
    onChange(newDate.toISOString());
    setIsOpen(false);
  };

  const handleMonthChange = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const handleTimeChange = (field, value) => {
    const newTime = new Date(selectedTime);
    if (field === 'hours') {
      newTime.setHours(parseInt(value));
    } else {
      newTime.setMinutes(parseInt(value));
    }
    setSelectedTime(newTime);
    onChange(newTime.toISOString());
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (type === 'datetime' || showTime) {
      return d.toLocaleString();
    }
    return d.toLocaleDateString();
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const today = new Date();

    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      
      const isToday = date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const isDisabled = (minDate && date < minDate) || (maxDate && date > maxDate);

      days.push(
        <button
          key={day}
          onClick={() => !isDisabled && handleDateClick(day)}
          disabled={isDisabled}
          className={`p-2 rounded-lg transition-colors ${
            isSelected
              ? 'bg-[var(--color-primary)]-600 text-white hover:bg-[var(--color-primary)]-700'
              : isToday
              ? 'bg-[var(--color-primary)]-100 text-[var(--color-primary)]-700'
              : 'hover:bg-[var(--color-surface)]'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          aria-label={`Select ${date.toLocaleDateString()}`}
          aria-disabled={isDisabled}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text)]">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />}
            {label}
          </div>
        </label>
      )}

      {/* Date Input */}
      <div className="relative">
        <div className="flex items-center border border-[var(--color-border)] rounded-lg focus-within focus:ring-2 focus:ring-[var(--color-primary)]-500">
          <Calendar className="h-5 w-5 text-[var(--color-textSecondary)] ml-3" aria-hidden="true" />
          <input
            type="text"
            value={formatDate(value)}
            readOnly
            onClick={() => setIsOpen(!isOpen)}
            className="flex-1 px-3 py-2 focus:outline-none cursor-pointer"
            aria-label="Open date picker"
          />
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 w-80 mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg p-4"
          >
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => handleMonthChange(-1)}
                className="p-1 hover:bg-[var(--color-surface)] rounded-lg"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div className="font-semibold">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </div>
              <button
                onClick={() => handleMonthChange(1)}
                className="p-1 hover:bg-[var(--color-surface)] rounded-lg"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Time Picker */}
            {showTime && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-[var(--color-background)] rounded-lg">
                <Clock className="h-4 w-4 text-[var(--color-textSecondary)]" aria-hidden="true" />
                <input
                  type="number"
                  value={selectedTime.getHours()}
                  onChange={(e) => handleTimeChange('hours', e.target.value)}
                  min="0"
                  max="23"
                  className="w-16 px-2 py-1 border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
                  aria-label="Hours"
                />
                <span className="text-[var(--color-textSecondary)]">:</span>
                <input
                  type="number"
                  value={selectedTime.getMinutes()}
                  onChange={(e) => handleTimeChange('minutes', e.target.value)}
                  min="0"
                  max="59"
                  className="w-16 px-2 py-1 border border-[var(--color-border)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]-500"
                  aria-label="Minutes"
                />
              </div>
            )}

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {dayNames.map(day => (
                <div key={day} className="text-xs font-medium text-[var(--color-textSecondary)] py-1">
                  {day}
                </div>
              ))}
              {renderCalendar()}
            </div>

            {/* Today Button */}
            <button
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setSelectedTime(today);
                onChange(today.toISOString());
                setIsOpen(false);
              }}
              className="w-full mt-4 px-4 py-2 bg-[var(--color-primary)]-600 text-white rounded-lg hover:bg-[var(--color-primary)]-700 transition-colors"
              aria-label="Select today"
            >
              Today
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatePicker;
