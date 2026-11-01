import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';

const AccessDenied = () => {
  const { user, isAdmin, isVolunteer, logout } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (isVolunteer) {
      navigate('/volunteer-dashboard');
    } else if (isAdmin) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-10 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 mb-2">Access Denied</h1>
          <p className="text-surface-500 mb-6">
            You don't have permission to access this page.
            {user && (
              <>
                <br />
                <span className="font-medium capitalize">{user.role}</span> role cannot access this resource.
              </>
            )}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              variant="secondary" 
              onClick={handleGoBack}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Go Back
            </Button>
            <Link to={isVolunteer ? '/volunteer-dashboard' : '/dashboard'}>
              <Button icon={<Home className="w-4 h-4" />}>
                My Dashboard
              </Button>
            </Link>
          </div>
          
          <div className="mt-6 pt-6 border-t border-surface-200">
            <p className="text-xs text-surface-400">
              Signed in as: <span className="font-medium">{user?.name || 'Unknown'}</span> 
              ({user?.role || 'unknown'})
            </p>
            <Button 
              variant="ghost" 
              onClick={logout}
              className="mt-3"
            >
              Sign Out
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default AccessDenied;