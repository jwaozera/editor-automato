import React from 'react';
import AutomatonEditor from './components/editor/AutomatonEditor';

function App() {
  return (
    <div className="App">
      <AutomatonEditor automatonType="dfa" />
    </div>
  );
}

export default App;
