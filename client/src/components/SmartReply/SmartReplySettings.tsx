import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  Box,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Paper,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  PlayArrow,
  Stop,
  Timer,
  SmartToy,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { smartReplyAPI } from '../../services/api/smartReply';

interface ReplyTemplate {
  id: string;
  reply_text: string;
  trigger_keywords: string[];
  delay_seconds: number;
  match_type: 'exact' | 'contains' | 'regex' | 'ai';
  is_active: boolean;
  priority: number;
  usage_count: number;
}

const SmartReplySettings: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<ReplyTemplate | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  
  // Form states
  const [replyText, setReplyText] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [matchType, setMatchType] = useState<'exact' | 'contains' | 'regex' | 'ai'>('contains');
  const [priority, setPriority] = useState(0);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = async () => {
    try {
      const response = await smartReplyAPI.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const templateData = {
        reply_text: replyText,
        trigger_keywords: keywords,
        delay_seconds: delaySeconds,
        match_type: matchType,
        priority: priority,
        is_active: true,
      };

      if (editingTemplate) {
        await smartReplyAPI.updateTemplate(editingTemplate.id, templateData);
      } else {
        await smartReplyAPI.createTemplate(templateData);
      }

      loadTemplates();
      resetForm();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Delete this template?')) {
      try {
        await smartReplyAPI.deleteTemplate(id);
        loadTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  const handleToggleTemplate = async (template: ReplyTemplate) => {
    try {
      await smartReplyAPI.updateTemplate(template.id, {
        is_active: !template.is_active,
      });
      loadTemplates();
    } catch (error) {
      console.error('Failed to toggle template:', error);
    }
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const resetForm = () => {
    setReplyText('');
    setKeywords([]);
    setKeywordInput('');
    setDelaySeconds(3);
    setMatchType('contains');
    setPriority(0);
    setEditingTemplate(null);
  };

  const handleEditTemplate = (template: ReplyTemplate) => {
    setEditingTemplate(template);
    setReplyText(template.reply_text);
    setKeywords(template.trigger_keywords);
    setDelaySeconds(template.delay_seconds);
    setMatchType(template.match_type);
    setPriority(template.priority);
    setTabValue(1);
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        color="primary"
        sx={{ ml: 1 }}
      >
        <SmartToy />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">智能回复设置</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={autoReplyEnabled}
                  onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                />
              }
              label="启用自动回复"
            />
          </Box>
        </DialogTitle>

        <DialogContent>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
            <Tab label="模板列表" />
            <Tab label="新建模板" />
            <Tab label="统计分析" />
          </Tabs>

          {tabValue === 0 && (
            <List>
              {templates.map((template) => (
                <Paper key={template.id} sx={{ mb: 1, p: 2 }}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="subtitle1">
                            {template.reply_text}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {template.trigger_keywords.map((keyword) => (
                              <Chip
                                key={keyword}
                                label={keyword}
                                size="small"
                                sx={{ mr: 0.5 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            icon={<Timer />}
                            label={`${template.delay_seconds}秒延迟`}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={template.match_type}
                            size="small"
                            color="primary"
                            sx={{ mr: 1 }}
                          />
                          <Chip
                            label={`已使用 ${template.usage_count} 次`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={template.is_active}
                        onChange={() => handleToggleTemplate(template)}
                      />
                      <IconButton onClick={() => handleEditTemplate(template)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDeleteTemplate(template.id)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}

          {tabValue === 1 && (
            <Box>
              <TextField
                fullWidth
                label="回复内容"
                multiline
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                margin="normal"
                helperText="支持变量: {name}, {time}, {date}"
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  触发关键词
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="输入关键词"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  />
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={handleAddKeyword}
                  >
                    添加
                  </Button>
                </Box>
                <Box>
                  {keywords.map((keyword) => (
                    <Chip
                      key={keyword}
                      label={keyword}
                      onDelete={() => handleRemoveKeyword(keyword)}
                      sx={{ mr: 0.5, mb: 0.5 }}
                    />
                  ))}
                </Box>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  回复延迟: {delaySeconds} 秒
                </Typography>
                <Slider
                  value={delaySeconds}
                  onChange={(_, v) => setDelaySeconds(v as number)}
                  min={0}
                  max={60}
                  marks={[
                    { value: 0, label: '立即' },
                    { value: 10, label: '10s' },
                    { value: 30, label: '30s' },
                    { value: 60, label: '60s' },
                  ]}
                />
              </Box>

              <FormControl fullWidth margin="normal">
                <InputLabel>匹配方式</InputLabel>
                <Select
                  value={matchType}
                  onChange={(e) => setMatchType(e.target.value as any)}
                  label="匹配方式"
                >
                  <MenuItem value="exact">精确匹配</MenuItem>
                  <MenuItem value="contains">包含匹配</MenuItem>
                  <MenuItem value="regex">正则表达式</MenuItem>
                  <MenuItem value="ai">AI智能匹配</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  优先级: {priority}
                </Typography>
                <Slider
                  value={priority}
                  onChange={(_, v) => setPriority(v as number)}
                  min={0}
                  max={10}
                  marks
                  step={1}
                />
              </Box>
            </Box>
          )}

          {tabValue === 2 && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                智能回复统计分析
              </Alert>
              <Typography variant="body2" color="text.secondary">
                功能开发中...
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>关闭</Button>
          {tabValue === 1 && (
            <Button
              onClick={handleSaveTemplate}
              variant="contained"
              disabled={!replyText || keywords.length === 0}
            >
              {editingTemplate ? '更新模板' : '保存模板'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SmartReplySettings;