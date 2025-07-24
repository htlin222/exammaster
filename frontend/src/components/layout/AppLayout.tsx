import { Layout, Menu, Button, Switch, Typography } from 'antd';
import { 
  DashboardOutlined, 
  BookOutlined, 
  BarChartOutlined, 
  SettingOutlined,
  BulbOutlined,
  MoonOutlined,
  SunOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useState } from 'react';
import QuestionImport from '../dashboard/QuestionImport';
import QuestionManagement from '../dashboard/QuestionManagement';
import PracticeSelection from '../practice/PracticeSelection';
import PracticeInterface from '../practice/PracticeInterface';
import PracticeResults from '../practice/PracticeResults';
import WrongQuestionsList from '../practice/WrongQuestionsList';
import Analytics from '../analytics/Analytics';
import Settings from '../settings/Settings';
import { Question, PracticeMode, PracticeSettings, PracticeSession } from '../../types';
import { usePracticeStore } from '../../stores/practiceStore';
import { useSettingsStore } from '../../stores/settingsStore';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: <span style={{ marginLeft: '12px' }}>儀表板</span>,
  },
  {
    key: 'questions',
    icon: <BookOutlined />,
    label: <span style={{ marginLeft: '12px' }}>題庫管理</span>,
  },
  {
    key: 'practice',
    icon: <BulbOutlined />,
    label: <span style={{ marginLeft: '12px' }}>開始練習</span>,
  },
  {
    key: 'wrong-questions',
    icon: <ExclamationCircleOutlined />,
    label: <span style={{ marginLeft: '12px' }}>錯題複習</span>,
  },
  {
    key: 'analytics',
    icon: <BarChartOutlined />,
    label: <span style={{ marginLeft: '12px' }}>統計分析</span>,
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: <span style={{ marginLeft: '12px' }}>設定</span>,
  },
];

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('dashboard');
  const [practiceSession, setPracticeSession] = useState<{
    questions: Question[];
    mode: PracticeMode;
    settings: PracticeSettings;
  } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [completedSession, setCompletedSession] = useState<PracticeSession | null>(null);
  
  const { sessions } = usePracticeStore();
  const { settings, updatePendingSettings, applySettings } = useSettingsStore();
  const isDarkMode = settings.theme === 'dark';

  const handleThemeChange = async (isDark: boolean) => {
    updatePendingSettings({ theme: isDark ? 'dark' : 'light' });
    await applySettings();
  };

  const renderContent = () => {
    switch (selectedKey) {
      case 'dashboard':
        return <QuestionImport />;
      case 'questions':
        return <QuestionManagement />;
      case 'practice':
        // Show results if practice is completed
        if (showResults && completedSession && practiceSession) {
          return (
            <PracticeResults
              session={completedSession}
              questions={practiceSession.questions}
              onRestart={() => {
                // Restart with same settings
                setShowResults(false);
                setCompletedSession(null);
                // Keep the practice session to restart
              }}
              onExit={() => {
                // Clear everything and return to selection
                setShowResults(false);
                setCompletedSession(null);
                setPracticeSession(null);
              }}
            />
          );
        }
        // If there's an active practice session, show the practice interface
        if (practiceSession) {
          return (
            <PracticeInterface
              questions={practiceSession.questions}
              mode={practiceSession.mode}
              onFinish={(completedSession) => {
                if (completedSession) {
                  setCompletedSession(completedSession);
                  setShowResults(true);
                } else {
                  // Fallback: clear session and return to selection
                  setPracticeSession(null);
                }
              }}
            />
          );
        }
        // Otherwise show the practice selection
        return (
          <PracticeSelection 
            onStartPractice={(questions, mode, settings) => {
              // Start the practice session
              setPracticeSession({ questions, mode, settings });
              setShowResults(false);
              setCompletedSession(null);
            }}
          />
        );
      case 'wrong-questions':
        return (
          <WrongQuestionsList 
            onStartPractice={() => {
              // Wrong question practice will be handled internally
              setSelectedKey('practice');
            }}
          />
        );
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return <QuestionImport />;
    }
  };

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme={isDarkMode ? 'dark' : 'light'}
        style={{ 
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          background: isDarkMode ? '#001529' : '#fff'
        }}>
          <Title level={4} style={{ 
            margin: 0, 
            color: isDarkMode ? 'white' : 'inherit' 
          }}>
            {collapsed ? 'EM' : 'ExamMaster'}
          </Title>
        </div>
        <Menu
          theme={isDarkMode ? 'dark' : 'light'}
          defaultSelectedKeys={['dashboard']}
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
          style={{ border: 'none' }}
        />
      </Sider>
      
      <Layout style={{ 
        marginLeft: collapsed ? 80 : 200,
        transition: 'margin-left 0.2s',
        height: '100vh',
        overflow: 'hidden'
      }}>
        <Header style={{ 
          padding: '0 16px', 
          background: isDarkMode ? '#001529' : '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          height: 64,
          lineHeight: '64px'
        }}>
          <Button
            type="text"
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          >
            {collapsed ? '>' : '<'}
          </Button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SunOutlined />
            <Switch
              checked={isDarkMode}
              onChange={handleThemeChange}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
            />
            <MoonOutlined />
          </div>
        </Header>
        
        <Content style={{ 
          height: 'calc(100vh - 64px)',
          overflow: 'auto',
          background: isDarkMode ? '#141414' : '#f0f2f5'
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;