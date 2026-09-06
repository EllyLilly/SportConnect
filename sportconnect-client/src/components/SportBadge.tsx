import BasketballIcon from '../assets/icons/Basketball-jasmine.svg';
import FitnessIcon from '../assets/icons/Fitness-jasmine.svg';
import PingPongIcon from '../assets/icons/Ping-Pong-jasmine.svg';
import RunningIcon from '../assets/icons/Running-jasmine.svg';
import SoccerIcon from '../assets/icons/Soccer-jasmine.svg';
import TennisIcon from '../assets/icons/Tennis-jasmine.svg';
import VolleyballIcon from '../assets/icons/Volleyball-jasmine.svg';
import WalkingIcon from '../assets/icons/Walking-jasmine.svg';

interface SportBadgeProps {
  name: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}

const iconMap: Record<string, string> = {
  'Футбол': SoccerIcon,
  'Волейбол': VolleyballIcon,
  'Баскетбол': BasketballIcon,
  'Теннис': TennisIcon,
  'Настольный теннис': PingPongIcon,
  'Бег': RunningIcon,
  'Фитнес': FitnessIcon,
  'Прогулка': WalkingIcon,
};

export default function SportBadge({ name, color, selected, onClick }: SportBadgeProps) {
  const icon = iconMap[name];

  return (
    <span
      onClick={onClick}
      title={name}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        margin: '0 4px',
        borderRadius: '10px',
        backgroundColor: selected ? `${color}20` : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: selected ? `2px solid ${color}` : '2px solid transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}10`;
        e.currentTarget.style.borderColor = color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = selected ? `${color}20` : 'transparent';
        e.currentTarget.style.borderColor = selected ? color : 'transparent';
      }}
    >
      {icon && <img src={icon} width={24} height={24} alt={name} />}
    </span>
  );
}