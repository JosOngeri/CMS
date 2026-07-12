import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AttendanceChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="text-center text-[var(--color-textSecondary)] py-8">No attendance data available</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="weekly" stroke="var(--color-primary)" name="Weekly" />
        <Line type="monotone" dataKey="monthly" stroke="var(--color-success)" name="Monthly" />
        <Line type="monotone" dataKey="yearly" stroke="var(--color-accent)" name="Yearly" />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default AttendanceChart;
