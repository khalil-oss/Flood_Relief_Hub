import { useState, useRef, useEffect, forwardRef } from 'react';

const Combobox = forwardRef(({ 
  label, 
  error, 
  options = [], 
  className = '', 
  id, 
  placeholder = 'Select or type...',
  ...props 
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState(options);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const comboboxId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const errorId = `${comboboxId}-error`;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const value = String(props.value ?? '').toLowerCase();
    if (value) {
      setFilteredOptions(options.filter(opt =>
        String(opt.label ?? '').toLowerCase().includes(value) ||
        String(opt.value ?? '').toLowerCase().includes(value)
      ));
    } else {
      setFilteredOptions(options);
    }
  }, [options, props.value]);

  const handleChange = (e) => {
    const value = e.target.value;
    setIsOpen(true);
    props.onChange?.({ target: { value } });
  };

  const handleSelect = (option) => {
    props.onChange?.({ target: { value: option.value } });
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
    } else if (e.key === 'Enter' && isOpen && filteredOptions.length > 0) {
      handleSelect(filteredOptions[0]);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {label && (
        <label htmlFor={comboboxId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={(el) => { inputRef.current = el; if (ref) ref.current = el; }}
          id={comboboxId}
          type="text"
          className={`input ${error ? 'input-error' : ''} pr-10`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
          aria-autocomplete="list"
          aria-controls={`${comboboxId}-listbox`}
          aria-expanded={isOpen}
          placeholder={placeholder}
          onChange={handleChange}
          onClick={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {isOpen ? (
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <ul 
          id={`${comboboxId}-listbox`}
          role="listbox"
          className="absolute z-10 w-full mt-1 max-h-60 overflow-auto rounded-lg border border-slate-300 bg-white shadow-lg ring-1 ring-black ring-opacity-5"
        >
          {filteredOptions.map((opt, _index) => (
            <li
              key={opt.value}
              role="option"
              className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-slate-900"
              onClick={() => handleSelect(opt)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
      
      {isOpen && filteredOptions.length === 0 && options.length > 0 && (
        <div className="absolute z-10 w-full mt-1 rounded-lg border border-slate-300 bg-white shadow-lg ring-1 ring-black ring-opacity-5 p-3 text-sm text-slate-500">
          No matching options
        </div>
      )}
      
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Combobox.displayName = 'Combobox';
export default Combobox;