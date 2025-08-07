import React from 'react';
import { PRAYER_TYPES, PRAYER_COLORS } from '../services/prayerService';

const PrayerStatusTile = ({ date, dayData }) => {
  const prayers = Object.values(PRAYER_TYPES);
  const prayerStatuses = prayers.map(p => (dayData ? dayData[p] : null));
  const filledPrayers = prayerStatuses.filter(s => s).length;

  // Default background for days with no prayers marked
  let backgroundStyle = { background: 'transparent' };

  if (filledPrayers > 0) {
    let gradientString = 'conic-gradient(';
    let currentAngle = 0;
    const anglePerPrayer = 360 / prayers.length;

    prayerStatuses.forEach((status, index) => {
      // Use light gray for unmarked prayers to show the complete ring
      const color = status ? PRAYER_COLORS[status] : '#e5e7eb'; // gray-200
      gradientString += `${color} ${currentAngle}deg ${currentAngle + anglePerPrayer}deg`;
      currentAngle += anglePerPrayer;
      if (index < prayers.length - 1) {
        gradientString += ', ';
      }
    });
    gradientString += ')';
    backgroundStyle = { background: gradientString };
  }

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-0"
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-200 ease-in-out transform group-hover:scale-110"
        style={backgroundStyle}
      >
        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
          <span className="text-gray-700 font-medium">{date.getDate()}</span>
        </div>
      </div>
    </div>
  );
};

export default PrayerStatusTile;
