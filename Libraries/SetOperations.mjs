export default class SetOperations{
  static IsSuperset(Set, Subset){
    for(const Element of Subset) if(!Set.has(Element)) return false;
    return true;
  }
  static IsSubset(Subset, Set){
    return SetOperations.IsSuperset(Set, Subset);
  }
  static Union(Set1, Set2){
    let Union = new Set(Set1);
    for(const Element of Set2) Union.add(Element);
    return Union;
  }
  static Intersection(Set1, Set2){
    let Intersection = new Set();
    for(const Element of Set1) if(Set2.has(Element)) Intersection.add(Element);
    return Intersection;
  }
  static SymmetricDifference(Set1, Set2){
    let SymmetricDifference = new Set(Set1);
    for(const Element of Set2){
      if(SymmetricDifference.has(Element)) SymmetricDifference.delete(Element);
      else SymmetricDifference.add(Element);
    }
    return SymmetricDifference;
  }
  static Difference(Set1, Set2){
    let Difference = new Set(Set1);
    for(const Element of Set2) if(Difference.has(Element)) Difference.delete(Element);
    return Difference;
  }
}
