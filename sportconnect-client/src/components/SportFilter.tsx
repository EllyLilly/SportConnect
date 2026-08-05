import { useState, useEffect } from 'react';
import SportBadge from './SportBadge';
import api from '../api/axios';

interface Sport {
  id: string;
  name: string;
  color: string;
}

interface SportFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function SportFilter({ selected, onChange }: SportFilterProps) {
  const [sports, setSports] = useState<Sport[]>([]);

  useEffect(() => {
    api.get('/sport').then((response) => setSports(response.data));
  }, []);

  const toggleSport = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div style={{ padding: '10px' }}>
      {sports.map((sport) => (
        <SportBadge
          key={sport.id}
          name={sport.name}
          color={sport.color}
          selected={selected.includes(sport.id)}
          onClick={() => toggleSport(sport.id)}
        />
      ))}
    </div>
  );
}