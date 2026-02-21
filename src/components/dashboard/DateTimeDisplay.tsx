import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export function DateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col">
      <div className="text-4xl font-bold text-white font-mono tracking-wider">
        {format(currentTime, 'HH:mm:ss')}
      </div>
      <div className="text-gray-400 text-sm mt-1">
        {format(currentTime, 'EEEE, d MMMM yyyy')}
      </div>
    </div>
  );
}
