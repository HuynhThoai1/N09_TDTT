import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from "../firebase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/'); 
    } catch (err) {
      setError('Sai email hoặc mật khẩu!');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Đăng Nhập</CardTitle>
          <CardDescription className="text-center">Đăng nhập để lưu hành trình của bạn</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" required onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input type="password" required onChange={(e) => setPassword(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full">Đăng nhập</Button>
            <div className="text-sm">
              Chưa có tài khoản? <Link to="/register" className="text-blue-600">Đăng ký</Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}