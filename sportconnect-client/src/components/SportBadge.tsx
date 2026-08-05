interface SportBadgeProps {
  name: string;
  color: string;
  selected?: boolean;
  onClick?: () => void;
}

export default function SportBadge({ name, color, selected, onClick }: SportBadgeProps) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-block',
        padding: '6px 14px',
        margin: '4px',
        borderRadius: '20px',
        backgroundColor: selected ? color : '#eee',
        color: selected ? '#fff' : '#333',
        cursor: 'pointer',
        fontWeight: selected ? 'bold' : 'normal',
        transition: 'all 0.2s',
        fontSize: '14px'
      }}
    >
      {name}
    </span>
  );
}