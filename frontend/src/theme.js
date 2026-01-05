import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary: {
      main: '#0b5fff',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#083fd1'
    }
  },
  components: {
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          backgroundColor: '#0b5fff',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#0952d9'
          }
        }
      }
    }
  }
})

export default theme
