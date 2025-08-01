# Anthropic API 环境变量配置
export ANTHROPIC_AUTH_TOKEN=sk-ant-oat01-6405db4633aeafaf73b953686387b9bf246b9de32992dc66ed23c6aba05767cd
export ANTHROPIC_API_KEY=sk-ant-oat01-6405db4633aeafaf73b953686387b9bf246b9de32992dc66ed23c6aba05767cd
export ANTHROPIC_BASE_URL=https://gaccode.com/claudecode

# Claude Code SSE 端口配置
export CLAUDE_CODE_SSE_PORT=50109

# 如果存在 .bashrc，则加载它
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi 