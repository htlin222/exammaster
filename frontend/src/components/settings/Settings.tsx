import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Typography,
  Space,
  Row,
  Col,
  InputNumber,
  Slider,
  Radio,
  Divider,
  Alert,
  message,
  Modal,
  Tabs,
  List,
  Tag,
  Progress,
  Checkbox,
  DatePicker
} from 'antd';
import {
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  EyeOutlined,
  DatabaseOutlined,
  SecurityScanOutlined,
  ExportOutlined,
  ImportOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ControlOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useSettingsStore } from '../../stores/settingsStore';
import { useQuestionStore } from '../../stores/questionStore';
import { UserSettings } from '../../types';
import { GetUserSettings, UpdateUserSettings, ResetAllData, ExportUserData, ExportSelectiveData, ExportGroupAsCSV, SaveFileToDownloads, ImportUserData, GetPracticeSessions } from '../../../wailsjs/go/main/App';
import { main } from '../../../wailsjs/go/models';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { confirm } = Modal;
const { RangePicker } = DatePicker;

interface SettingsProps {}

interface ExtendedUserSettings extends UserSettings {
  // Additional settings not in the core UserSettings type
  username?: string;
  defaultQuestionCount?: number;
  
  // Timer settings
  enableTimer?: boolean;
  timePerQuestion?: number;
  
  // Answer settings
  allowSkipQuestions?: boolean;
  allowMarkQuestions?: boolean;
  showImmediateAnswers?: boolean;
  
  // Result settings
  saveHistory?: boolean;
  showDetailedStats?: boolean;
  
  // UI settings
  showExplanations?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  questionSpacing?: number;
  showProgress?: boolean;
  highlightCorrectAnswers?: boolean;
  
  // Notification settings
  enableNotifications?: boolean;
  reminderTime?: string;
  studyGoal?: number;
  shareAnonymousStats?: boolean;
}

const defaultSettings: ExtendedUserSettings = {
  username: '',
  language: 'zh-TW',
  theme: 'light',
  fontSize: 'medium',
  defaultPracticeMode: 'practice',
  dailyReminder: false,
  defaultQuestionCount: 10,
  
  // Timer settings
  enableTimer: false,
  timePerQuestion: 60,
  
  // Answer settings
  allowSkipQuestions: true,
  allowMarkQuestions: true,
  showImmediateAnswers: false,
  
  // Result settings
  saveHistory: true,
  showDetailedStats: true,
  
  // UI settings
  showExplanations: true,
  randomizeQuestions: true,
  randomizeOptions: false,
  questionSpacing: 16,
  showProgress: true,
  highlightCorrectAnswers: true,
  
  // Notification settings
  enableNotifications: false,
  reminderTime: '09:00',
  studyGoal: 20,
  shareAnonymousStats: false
};

const Settings: React.FC<SettingsProps> = () => {
  const { 
    settings, 
    pendingSettings, 
    hasChanges, 
    loading, 
    updatePendingSettings, 
    applySettings, 
    loadSettings,
    discardChanges,
    resetSettings 
  } = useSettingsStore();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('general');
  const [todayProgress, setTodayProgress] = useState({ completed: 0, goal: 20 });
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeQuestions: true,
    includeGroups: true,
    includeSessions: false,
    includeSettings: false,
    includeWrongQuestions: false,
    groupIds: [] as string[],
    dateRange: null as [string, string] | null,
    format: 'json'
  });
  const [exporting, setExporting] = useState(false);
  
  const { groups } = useQuestionStore();

  useEffect(() => {
    loadSettings();
    if (pendingSettings.studyGoal) {
      loadTodayProgress();
    }
  }, [loadSettings]);

  // Update progress goal when settings change
  useEffect(() => {
    setTodayProgress(prev => ({ ...prev, goal: settings.studyGoal || 20 }));
  }, [settings.studyGoal]);

  const loadTodayProgress = async () => {
    try {
      const sessions = await GetPracticeSessions();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todaySessions = sessions.filter(session => {
        const sessionDate = new Date(session.createdAt);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });
      
      const completedToday = todaySessions.reduce((sum, session) => sum + session.totalQuestions, 0);
      setTodayProgress({ completed: completedToday, goal: pendingSettings.studyGoal || 20 });
    } catch (error) {
      console.error('Failed to load today progress:', error);
    }
  };

  // Update form when pendingSettings change
  useEffect(() => {
    form.setFieldsValue(pendingSettings);
  }, [pendingSettings, form]);

  const handleApplySettings = async () => {
    try {
      await applySettings();
      message.success('設定已套用');
    } catch (error) {
      console.error('Failed to apply settings:', error);
      message.error('套用設定失敗');
    }
  };

  const handleDiscardChanges = () => {
    discardChanges();
    form.setFieldsValue(settings);
    message.info('變更已取消');
  };


  const handleFormChange = useCallback((changedFields: any, allFields: any) => {
    // Update pending settings when form changes
    const values = form.getFieldsValue();
    updatePendingSettings(values);
  }, [form, updatePendingSettings]);

  const handleResetData = () => {
    confirm({
      title: '確認重置所有資料',
      content: '這將刪除所有題目、練習記錄和設定。此操作無法復原，您確定要繼續嗎？',
      okText: '確認重置',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          await ResetAllData();
          message.success('資料已重置');
          // Reload settings after reset
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          message.error('重置失敗：' + (error as Error).message);
        }
      }
    });
  };

  const handleExportData = async () => {
    try {
      const data = await ExportUserData();
      const dataStr = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `exammaster-backup-${timestamp}.json`;
      
      await SaveFileToDownloads(filename, dataStr);
      message.success('資料已匯出到下載資料夾');
    } catch (error) {
      message.error('匯出失敗：' + (error as Error).message);
    }
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        const result = await ImportUserData(data);
        
        if (result.success) {
          message.success(`匯入成功！已匯入 ${result.imported} 項資料`);
          if (result.errors.length > 0) {
            console.warn('匯入警告:', result.errors);
            message.warning(`有 ${result.errors.length} 項資料匯入時發生警告`);
          }
          // Reload to refresh all data
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          message.error('匯入失敗：' + result.errors.join(', '));
        }
      } catch (error) {
        message.error('匯入失敗：檔案格式不正確或解析錯誤');
      }
    };
    input.click();
  };

  const handleSelectiveExport = async () => {
    try {
      setExporting(true);
      
      // Create ExportOptions instance
      const options = new main.ExportOptions({
        includeQuestions: exportOptions.includeQuestions,
        includeGroups: exportOptions.includeGroups,
        includeSessions: exportOptions.includeSessions,
        includeSettings: exportOptions.includeSettings,
        includeWrongQuestions: exportOptions.includeWrongQuestions,
        groupIds: exportOptions.groupIds,
        dateRange: exportOptions.dateRange ? {
          startDate: exportOptions.dateRange[0],
          endDate: exportOptions.dateRange[1]
        } : null,
        format: exportOptions.format
      });
      
      const data = await ExportSelectiveData(options);
      const dataStr = JSON.stringify(data, null, 2);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `exammaster-selective-${timestamp}.json`;
      
      await SaveFileToDownloads(filename, dataStr);
      message.success('選擇性匯出完成！');
      setExportModalVisible(false);
    } catch (error) {
      message.error('選擇性匯出失敗：' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleExportGroupAsCSV = async (groupId: string, groupName: string) => {
    try {
      const csvContent = await ExportGroupAsCSV(groupId);
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${groupName}-${timestamp}.csv`;
      
      await SaveFileToDownloads(filename, csvContent);
      message.success(`群組 "${groupName}" 已匯出為 CSV 格式`);
    } catch (error) {
      message.error('CSV 匯出失敗：' + (error as Error).message);
    }
  };

  const renderGeneralSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Study Goal Progress */}
      <Card title="今日學習進度" size="small">
        <Row gutter={16} align="middle">
          <Col span={16}>
            <div style={{ marginBottom: 8 }}>
              <Text strong>
                {todayProgress.completed} / {todayProgress.goal} 題
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                ({Math.round((todayProgress.completed / todayProgress.goal) * 100)}%)
              </Text>
            </div>
            <Progress 
              percent={Math.min((todayProgress.completed / todayProgress.goal) * 100, 100)}
              status={todayProgress.completed >= todayProgress.goal ? 'success' : 'active'}
              strokeColor={todayProgress.completed >= todayProgress.goal ? '#52c41a' : '#1890ff'}
            />
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            {todayProgress.completed >= todayProgress.goal ? (
              <Text type="success">
                <CheckCircleOutlined /> 目標達成！
              </Text>
            ) : (
              <Text type="secondary">
                還需 {todayProgress.goal - todayProgress.completed} 題
              </Text>
            )}
          </Col>
        </Row>
      </Card>

      <Card title="個人資訊" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="username" label="使用者名稱">
              <Input placeholder="輸入您的名稱" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="language" label="語言">
              <Select>
                <Option value="zh-TW">繁體中文</Option>
                <Option value="zh-CN">简体中文</Option>
                <Option value="en-US">English</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="外觀設定" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="theme" label="主題">
              <Radio.Group>
                <Radio value="light">淺色</Radio>
                <Radio value="dark">深色</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="fontSize" label="字體大小">
              <Radio.Group>
                <Radio value="small">小</Radio>
                <Radio value="medium">中</Radio>
                <Radio value="large">大</Radio>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="questionSpacing" label="間距">
              <Slider
                min={8}
                max={24}
                marks={{
                  8: '緊密',
                  16: '標準',
                  24: '寬鬆'
                }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="系統設定" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="saveHistory" valuePropName="checked">
            <Switch /> 儲存練習記錄
          </Form.Item>
          <Form.Item name="shareAnonymousStats" valuePropName="checked">
            <Switch /> 分享匿名統計資訊（幫助改善軟體）
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  const renderPracticeSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="預設練習設定" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="defaultPracticeMode" label="預設模式">
              <Select>
                <Option value="practice">練習模式</Option>
                <Option value="test">測驗模式</Option>
                <Option value="review">複習模式</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="defaultQuestionCount" label="預設題數">
              <InputNumber min={1} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="studyGoal" label="每日目標（題）">
              <InputNumber min={1} max={200} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="計時設定" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="enableTimer" valuePropName="checked">
              <Switch /> 啟用計時器
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="timePerQuestion" label="每題時間限制（秒）">
              <InputNumber min={15} max={300} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="題目顯示" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="showExplanations" valuePropName="checked">
            <Switch /> 顯示題目解釋
          </Form.Item>
          <Form.Item name="randomizeQuestions" valuePropName="checked">
            <Switch /> 隨機排序題目
          </Form.Item>
          <Form.Item name="randomizeOptions" valuePropName="checked">
            <Switch /> 隨機排序選項
          </Form.Item>
          <Form.Item name="showProgress" valuePropName="checked">
            <Switch /> 顯示進度條
          </Form.Item>
          <Form.Item name="highlightCorrectAnswers" valuePropName="checked">
            <Switch /> 高亮正確答案
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  const renderAdvancedSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Alert
        message="進階設定"
        description="這些設定將在未來版本中提供更多選項"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Card title="時間設定" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="enableTimer" valuePropName="checked">
            <Switch /> 啟用計時器
          </Form.Item>
          <Form.Item name="timePerQuestion" label="設定每題時間限制">
            <Row gutter={16}>
              <Col span={12}>
                <InputNumber 
                  min={15} 
                  max={300} 
                  style={{ width: '100%' }}
                  disabled={!settings.enableTimer}
                  addonAfter="秒"
                />
              </Col>
              <Col span={12}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  範圍：15-300秒
                </Text>
              </Col>
            </Row>
          </Form.Item>
        </Space>
      </Card>

      <Card title="答題設定" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="allowSkipQuestions" valuePropName="checked">
            <Switch /> 允許跳過題目
          </Form.Item>
          <Form.Item name="allowMarkQuestions" valuePropName="checked">
            <Switch /> 允許標記題目
          </Form.Item>
          <Form.Item name="showImmediateAnswers" valuePropName="checked">
            <Switch /> 立即顯示正確答案
          </Form.Item>
        </Space>
      </Card>

      <Card title="結果設定" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="saveHistory" valuePropName="checked">
            <Switch /> 儲存練習記錄
          </Form.Item>
          <Form.Item name="showDetailedStats" valuePropName="checked">
            <Switch /> 顯示詳細統計
          </Form.Item>
        </Space>
      </Card>
    </Space>
  );

  const renderNotificationSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="提醒設定" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Form.Item name="enableNotifications" valuePropName="checked">
            {/* TODO: 實作桌面通知功能 - 需要 Web Notification API 整合 */}
            <Switch /> 啟用通知
          </Form.Item>
          <Form.Item name="dailyReminder" valuePropName="checked">
            {/* TODO: 實作每日提醒功能 - 需要排程系統和通知觸發機制 */}
            <Switch /> 每日學習提醒
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="reminderTime" label="提醒時間">
                <Input type="time" />
              </Form.Item>
            </Col>
          </Row>
        </Space>
      </Card>

      <Alert
        message="通知功能"
        description="桌面通知功能需要瀏覽器權限，部分功能在桌面應用中可能不同。"
        type="info"
        showIcon
      />
    </Space>
  );

  const renderDataSettings = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="資料管理" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={5}>匯出資料</Title>
            <Paragraph type="secondary">
              將您的資料匯出為JSON或CSV檔案，可用於備份或轉移。
            </Paragraph>
            <Space>
              <Button 
                type="primary" 
                icon={<ExportOutlined />}
                onClick={handleExportData}
              >
                匯出所有資料
              </Button>
              <Button 
                icon={<ControlOutlined />}
                onClick={() => setExportModalVisible(true)}
              >
                選擇性匯出
              </Button>
            </Space>
          </div>

          <Divider />

          <div>
            <Title level={5}>匯入資料</Title>
            <Paragraph type="secondary">
              從JSON檔案匯入備份的資料。注意：這會覆蓋現有資料。
            </Paragraph>
            <Button 
              icon={<ImportOutlined />}
              onClick={handleImportData}
            >
              匯入資料
            </Button>
          </div>

          <Divider />

          <div>
            <Title level={5}>群組匯出 (CSV)</Title>
            <Paragraph type="secondary">
              將特定群組的題目匯出為 CSV 格式檔案。
            </Paragraph>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <List
                size="small"
                dataSource={groups}
                renderItem={(group) => (
                  <List.Item
                    actions={[
                      <Button 
                        size="small" 
                        icon={<ExportOutlined />}
                        onClick={() => handleExportGroupAsCSV(group.id, group.name)}
                      >
                        匯出 CSV
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={group.name}
                      description={`${group.questionIds?.length || 0} 題`}
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>

          <Divider />

          <div>
            <Title level={5} type="danger">重置所有資料</Title>
            <Paragraph type="secondary">
              刪除所有題目、練習記錄和設定，將應用程式恢復到初始狀態。此操作無法復原。
            </Paragraph>
            <Button 
              danger 
              icon={<DeleteOutlined />}
              onClick={handleResetData}
            >
              重置所有資料
            </Button>
          </div>
        </Space>
      </Card>

      <Card title="資料統計" size="small">
        <List size="small">
          <List.Item>
            <Text>資料庫位置：</Text>
            <Text code>~/.exammaster/exammaster.db</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              會根據作業系統自動建立在使用者目錄下
            </Text>
          </List.Item>
          <List.Item>
            <Text>應用程式版本：</Text>
            <Tag color="blue">v1.0.0</Tag>
          </List.Item>
          <List.Item>
            <Text>最後備份：</Text>
            <Text type="secondary">尚未備份</Text>
          </List.Item>
        </List>
      </Card>
    </Space>
  );

  const renderAbout = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="關於 ExamMaster" size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Title level={4}>ExamMaster v1.0.0</Title>
            <Paragraph>
              智慧考古題練習系統，使用 Wails 框架開發，結合 Go 後端和 React 前端，
              提供高效的學習體驗。
            </Paragraph>
          </div>

          <Divider />

          <div>
            <Title level={5}>功能特色</Title>
            <List size="small">
              <List.Item>• 多種練習模式（練習、測驗、複習）</List.Item>
              <List.Item>• 智慧題目分組和標籤系統</List.Item>
              <List.Item>• 詳細的統計分析報告</List.Item>
              <List.Item>• 靈活的題目匯入和匯出</List.Item>
              <List.Item>• 個人化設定和主題</List.Item>
            </List>
          </div>

          <Divider />

          <div>
            <Title level={5}>技術架構</Title>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>前端技術：</Text>
                <List size="small">
                  <List.Item>• React 18</List.Item>
                  <List.Item>• TypeScript</List.Item>
                  <List.Item>• Ant Design</List.Item>
                  <List.Item>• Zustand</List.Item>
                </List>
              </Col>
              <Col span={12}>
                <Text strong>後端技術：</Text>
                <List size="small">
                  <List.Item>• Go 1.23</List.Item>
                  <List.Item>• Wails v2</List.Item>
                  <List.Item>• SQLite</List.Item>
                  <List.Item>• 原生桌面整合</List.Item>
                </List>
              </Col>
            </Row>
          </div>
        </Space>
      </Card>
    </Space>
  );

  const renderSelectiveExportModal = () => (
    <Modal
      title="選擇性匯出"
      open={exportModalVisible}
      onOk={handleSelectiveExport}
      onCancel={() => setExportModalVisible(false)}
      confirmLoading={exporting}
      width={600}
      okText="開始匯出"
      cancelText="取消"
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={5}>匯出內容</Title>
          <Checkbox.Group
            value={Object.keys(exportOptions).filter(key => 
              exportOptions[key as keyof typeof exportOptions] === true
            )}
            onChange={(values) => {
              setExportOptions(prev => ({
                ...prev,
                includeQuestions: values.includes('includeQuestions'),
                includeGroups: values.includes('includeGroups'),
                includeSessions: values.includes('includeSessions'),
                includeSettings: values.includes('includeSettings'),
                includeWrongQuestions: values.includes('includeWrongQuestions')
              }));
            }}
          >
            <Space direction="vertical">
              <Checkbox value="includeQuestions">題目資料</Checkbox>
              <Checkbox value="includeGroups">群組資料</Checkbox>
              <Checkbox value="includeSessions">練習記錄</Checkbox>
              <Checkbox value="includeWrongQuestions">錯題記錄</Checkbox>
              <Checkbox value="includeSettings">使用者設定</Checkbox>
            </Space>
          </Checkbox.Group>
        </div>

        <div>
          <Title level={5}>群組篩選</Title>
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="選擇特定群組（留空表示全部）"
            value={exportOptions.groupIds}
            onChange={(values) => setExportOptions(prev => ({ ...prev, groupIds: values }))}
            allowClear
          >
            {groups.map(group => (
              <Option key={group.id} value={group.id}>
                {group.name} ({group.questionIds?.length || 0} 題)
              </Option>
            ))}
          </Select>
        </div>

        <div>
          <Title level={5}>日期範圍</Title>
          <RangePicker
            style={{ width: '100%' }}
            placeholder={['開始日期', '結束日期']}
            onChange={(dates, dateStrings) => {
              setExportOptions(prev => ({
                ...prev,
                dateRange: dates ? [dateStrings[0], dateStrings[1]] : null
              }));
            }}
          />
        </div>

        <Alert
          message="匯出說明"
          description="選擇性匯出可以讓您匯出特定的資料內容、群組或時間範圍。匯出的檔案會以 JSON 格式儲存。"
          type="info"
          showIcon
        />
      </Space>
    </Modal>
  );

  return (
    <div style={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '16px 24px 0 24px',
        flexShrink: 0
      }}>
        <Title level={2} style={{ margin: '0 0 16px 0' }}>設定</Title>
      </div>
      
      <div style={{ 
        flex: 1,
        overflow: 'hidden',
        padding: '0 24px 24px 24px'
      }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={settings}
          onValuesChange={handleFormChange}
          style={{ height: '100%' }}
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
            tabBarStyle={{ flexShrink: 0 }}
          >
            <TabPane 
              tab={
                <span>
                  <SettingOutlined />
                  一般設定
                </span>
              } 
              key="general"
              style={{ 
                height: '100%',
                overflow: 'auto'
              }}
            >
              {renderGeneralSettings()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <EyeOutlined />
                  練習設定
                </span>
              } 
              key="practice"
              style={{ 
                height: '100%',
                overflow: 'auto'
              }}
            >
              {renderPracticeSettings()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <ControlOutlined />
                  進階設定
                </span>
              } 
              key="advanced"
              style={{ 
                height: '100%',
                overflow: 'auto'
              }}
            >
              {renderAdvancedSettings()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <BellOutlined />
                  通知設定
                </span>
              } 
              key="notifications"
              style={{ 
                height: '100%',
                overflow: 'auto'
              }}
            >
              {renderNotificationSettings()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <DatabaseOutlined />
                  資料管理
                </span>
              } 
              key="data"
              style={{ 
                height: '100%',
                overflow: 'auto'
              }}
            >
              {renderDataSettings()}
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <SecurityScanOutlined />
                  關於
                </span>
              } 
              key="about"
              style={{ 
                height: '100%',
                overflow: 'auto'
              }}
            >
              {renderAbout()}
            </TabPane>
          </Tabs>
        </Form>

        {hasChanges && (
          <div style={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 24,
            zIndex: 1000,
            display: 'flex',
            gap: 8
          }}>
            <Button 
              size="large"
              onClick={handleDiscardChanges}
              disabled={loading}
            >
              取消變更
            </Button>
            <Button 
              type="primary" 
              size="large"
              loading={loading}
              onClick={handleApplySettings}
            >
              套用設定
            </Button>
          </div>
        )}
      </div>
      
      {renderSelectiveExportModal()}
    </div>
  );
};

export default Settings;